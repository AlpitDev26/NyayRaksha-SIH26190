import random
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ResourceNotFoundException
from app.db.models import AuditEvent, Case, CaseAssignment, CustodyEvent, Document, User
from app.schemas.case import CaseAssignmentResponse, CaseCreate, CaseResponse, CaseUpdate


class CaseService:
    @staticmethod
    def generate_case_id() -> str:
        year = datetime.now(timezone.utc).year
        rand_num = random.randint(100000, 999999)
        return f"CASE-{year}-{rand_num}"

    @staticmethod
    async def list_cases(
        db: AsyncSession,
        user: User,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[CaseResponse]:
        user_roles = [r.name for r in user.roles]
        is_global_viewer = any(r in {"ADMIN", "JUDGE", "AUDITOR", "COURT_CLERK", "PROSECUTOR"} for r in user_roles)

        stmt = select(Case).options(
            selectinload(Case.assignments).selectinload(CaseAssignment.user),
            selectinload(Case.documents),
        )

        # Filter to assigned cases for Officers unless global viewer
        if not is_global_viewer:
            stmt = stmt.join(Case.assignments).where(
                CaseAssignment.user_id == user.id,
                CaseAssignment.revoked_at.is_(None),
            )

        if status:
            stmt = stmt.where(Case.status == status.upper())
        if priority:
            stmt = stmt.where(Case.priority == priority.upper())
        if search:
            stmt = stmt.where(
                (Case.title.ilike(f"%{search}%"))
                | (Case.fir_number.ilike(f"%{search}%"))
                | (Case.id.ilike(f"%{search}%"))
            )

        stmt = stmt.order_by(desc(Case.created_at))
        result = await db.execute(stmt)
        cases = result.scalars().unique().all()

        responses = []
        for c in cases:
            assignments = [
                CaseAssignmentResponse(
                    id=a.id,
                    user_id=a.user_id,
                    user_name=a.user.full_name if a.user else "Assigned Officer",
                    role_in_case=a.role_in_case,
                    assigned_at=a.assigned_at,
                )
                for a in c.assignments
                if a.revoked_at is None
            ]
            responses.append(
                CaseResponse(
                    id=c.id,
                    fir_number=c.fir_number,
                    title=c.title,
                    category=c.category,
                    status=c.status,
                    priority=c.priority,
                    jurisdiction=c.jurisdiction,
                    lead_investigator_id=c.lead_investigator_id,
                    date_opened=c.date_opened,
                    summary=c.summary,
                    classification=c.classification,
                    is_legal_hold=c.is_legal_hold,
                    tags=c.tags,
                    document_count=len(c.documents),
                    assignments=assignments,
                    created_at=c.created_at,
                    updated_at=c.updated_at,
                )
            )
        return responses

    @staticmethod
    async def create_case(db: AsyncSession, case_data: CaseCreate, creator: User) -> CaseResponse:
        case_id = CaseService.generate_case_id()
        new_case = Case(
            id=case_id,
            fir_number=case_data.fir_number,
            title=case_data.title,
            category=case_data.category.upper(),
            status="OPEN",
            priority=case_data.priority.upper(),
            jurisdiction=case_data.jurisdiction,
            lead_investigator_id=case_data.lead_investigator_id or creator.id,
            summary=case_data.summary,
            classification=case_data.classification.upper(),
            tags=case_data.tags,
        )
        db.add(new_case)

        # Automatically assign creator to case
        assignment = CaseAssignment(
            case_id=case_id,
            user_id=creator.id,
            role_in_case="CREATOR_OFFICER",
        )
        db.add(assignment)

        # Audit creation
        audit = AuditEvent(
            actor_id=creator.id,
            actor_name=creator.full_name,
            actor_role=creator.roles[0].name if creator.roles else "OFFICER",
            action="CASE_CREATED",
            resource_type="CASE",
            resource_id=case_id,
            case_id=case_id,
            outcome="SUCCESS",
            details={"title": case_data.title, "priority": case_data.priority},
        )
        db.add(audit)
        await db.commit()

        return await CaseService.get_case_by_id(db, case_id)

    @staticmethod
    async def get_case_by_id(db: AsyncSession, case_id: str) -> CaseResponse:
        stmt = (
            select(Case)
            .where(Case.id == case_id)
            .options(
                selectinload(Case.assignments).selectinload(CaseAssignment.user),
                selectinload(Case.documents),
            )
        )
        result = await db.execute(stmt)
        c = result.scalar_one_or_none()
        if not c:
            raise ResourceNotFoundException(f"Case with ID {case_id} does not exist.")

        assignments = [
            CaseAssignmentResponse(
                id=a.id,
                user_id=a.user_id,
                user_name=a.user.full_name if a.user else "Assigned Officer",
                role_in_case=a.role_in_case,
                assigned_at=a.assigned_at,
            )
            for a in c.assignments
            if a.revoked_at is None
        ]

        return CaseResponse(
            id=c.id,
            fir_number=c.fir_number,
            title=c.title,
            category=c.category,
            status=c.status,
            priority=c.priority,
            jurisdiction=c.jurisdiction,
            lead_investigator_id=c.lead_investigator_id,
            date_opened=c.date_opened,
            summary=c.summary,
            classification=c.classification,
            is_legal_hold=c.is_legal_hold,
            tags=c.tags,
            document_count=len(c.documents),
            assignments=assignments,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )

    @staticmethod
    async def get_case_timeline(db: AsyncSession, case_id: str):
        stmt = (
            select(CustodyEvent)
            .where(CustodyEvent.case_id == case_id)
            .order_by(desc(CustodyEvent.timestamp_utc))
        )
        result = await db.execute(stmt)
        return result.scalars().all()
