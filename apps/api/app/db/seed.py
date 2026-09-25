import asyncio
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.adapters.blockchain.blockchain_adapter import get_blockchain_adapter
from app.adapters.storage.storage_adapter import get_storage_adapter
from app.core.security import compute_sha256, hash_password
from app.db.models import (
    AccessGrant,
    AccessRequest,
    AuditEvent,
    Case,
    CaseAssignment,
    CustodyEvent,
    DigitalSignature,
    Document,
    DocumentVersion,
    Organization,
    Role,
    SecurityAlert,
    User,
    UserRole,
)
from app.db.session import AsyncSessionLocal, init_db

DEMO_PASSWORD = "DemoSecurePassword2026!"


async def seed_database(session_factory=None):
    factory = session_factory or AsyncSessionLocal
    if not session_factory:
        await init_db()
    async with factory() as session:
        # Check if already seeded
        existing_user = await session.execute(select(User).limit(1))
        if existing_user.scalar_one_or_none():
            print("Database already contains data. Skipping full seeding.")
            return

        print("Seeding institutional organizations...")
        org_police = Organization(id="org-police", name="Delhi Police Crime Branch", code="DP_CRIME", org_type="POLICE")
        org_court = Organization(id="org-court", name="High Court Registry, Courtroom 4", code="HC_REG", org_type="COURT")
        org_prosecution = Organization(id="org-pros", name="Directorate of Public Prosecutions", code="DPP_DELHI", org_type="PROSECUTION")
        org_forensic = Organization(id="org-cfsl", name="Central Forensic Science Laboratory (CFSL)", code="CFSL_CBI", org_type="FORENSIC")
        org_audit = Organization(id="org-audit", name="National Audit & Compliance Directorate", code="CAG_AUDIT", org_type="AUDIT")
        session.add_all([org_police, org_court, org_prosecution, org_forensic, org_audit])
        await session.flush()

        print("Seeding institutional roles...")
        roles_data = [
            ("ADMIN", "System Administrator"),
            ("POLICE_OFFICER", "Police Officer / Evidence Officer"),
            ("INVESTIGATING_OFFICER", "Investigating Officer"),
            ("FORENSIC_ANALYST", "Forensic Analyst"),
            ("PROSECUTOR", "Prosecutor / Legal Officer"),
            ("COURT_CLERK", "Court Clerk"),
            ("JUDGE", "Judge"),
            ("AUDITOR", "Auditor / Compliance Officer"),
            ("EXTERNAL_REVIEWER", "External Reviewer"),
        ]
        role_map = {}
        for r_name, r_desc in roles_data:
            role = Role(id=f"role-{r_name.lower()}", name=r_name, description=r_desc)
            session.add(role)
            role_map[r_name] = role
        await session.flush()

        print("Seeding 8 demo user accounts...")
        hashed_pwd = hash_password(DEMO_PASSWORD)
        users_data = [
            ("u-admin", "admin@nyayavault.demo", "Alok Verma", "ADMIN", "org-audit", True),
            ("u-officer", "officer@nyayavault.demo", "Insp. Rajesh Sharma", "POLICE_OFFICER", "org-police", False),
            ("u-investigator", "investigator@nyayavault.demo", "ACP Priya Nair", "INVESTIGATING_OFFICER", "org-police", False),
            ("u-forensic", "forensic@nyayavault.demo", "Dr. Anand Swaminathan", "FORENSIC_ANALYST", "org-cfsl", False),
            ("u-prosecutor", "prosecutor@nyayavault.demo", "Adv. Meera Joshi", "PROSECUTOR", "org-pros", False),
            ("u-clerk", "clerk@nyayavault.demo", "R. K. Gupta", "COURT_CLERK", "org-court", False),
            ("u-judge", "judge@nyayavault.demo", "Justice S. K. Roy", "JUDGE", "org-court", True),
            ("u-auditor", "auditor@nyayavault.demo", "Sunita Deshmukh", "AUDITOR", "org-audit", True),
        ]
        user_map = {}
        for uid, email, name, role_name, org_id, mfa in users_data:
            user = User(
                id=uid,
                email=email,
                full_name=name,
                hashed_password=hashed_pwd,
                organization_id=org_id,
                is_active=True,
                is_mfa_enabled=mfa,
                mfa_secret="JBSWY3DPEHPK3PXP" if mfa else None,
            )
            session.add(user)
            user_map[role_name] = user
            # Assign role
            session.add(UserRole(user_id=uid, role_id=f"role-{role_name.lower()}"))
        await session.flush()

        print("Seeding 3 realistic investigation cases...")
        now = datetime.now(timezone.utc)
        cases_data = [
            (
                "CASE-2026-000101",
                "FIR-2026/894",
                "Missing Person Investigation: A. K. Mehra",
                "MISSING_PERSON",
                "UNDER_INVESTIGATION",
                "HIGH",
                "Special Crime Branch, New Delhi",
                "u-investigator",
                "Investigation into the sudden disappearance of Senior Analyst A. K. Mehra following corporate data leak report.",
                "RESTRICTED",
                "missing,cyber,priority",
            ),
            (
                "CASE-2026-000102",
                "FIR-2026/1022",
                "Financial Fraud Investigation: Apex Merchant Gateway Interception",
                "FINANCIAL_FRAUD",
                "UNDER_REVIEW",
                "CRITICAL",
                "Economic Offences Wing, Cyber Division",
                "u-investigator",
                "Cross-border unauthorized diversion of merchant settlement funds totaling INR 4.2 Crores across gateway nodes.",
                "RESTRICTED",
                "banking,fraud,merchant,ledger",
            ),
            (
                "CASE-2026-000103",
                "FIR-2026/512",
                "Controlled Evidence Review: State vs. Sharma & Ors",
                "CYBER_CRIME",
                "FILED_IN_COURT",
                "MEDIUM",
                "High Court Special Bench, New Delhi",
                "u-prosecutor",
                "Judicial review and custodial cross-examination of digital forensics evidence in intellectual property espionage.",
                "CONFIDENTIAL",
                "court,forensic,charge-sheet",
            ),
        ]

        for cid, fir, title, cat, status, prio, jur, lead, summ, cls, tags in cases_data:
            c = Case(
                id=cid,
                fir_number=fir,
                title=title,
                category=cat,
                status=status,
                priority=prio,
                jurisdiction=jur,
                lead_investigator_id=lead,
                summary=summ,
                classification=cls,
                tags=tags,
                date_opened=now - timedelta(days=14),
            )
            session.add(c)
            # Team assignments
            session.add(CaseAssignment(case_id=cid, user_id=lead, role_in_case="LEAD_INVESTIGATOR"))
            session.add(CaseAssignment(case_id=cid, user_id="u-officer", role_in_case="EVIDENCE_OFFICER"))
            session.add(CaseAssignment(case_id=cid, user_id="u-forensic", role_in_case="FORENSIC_EXAMINER"))
        await session.flush()

        print("Seeding 20+ realistic legal documents with blockchain anchors and custody logs...")
        blockchain = get_blockchain_adapter()
        storage = get_storage_adapter()

        docs_metadata = [
            # Case 101 Documents
            ("CASE-2026-000101", "FIR No. 894/2026 Certified Copy", "FIR", "RESTRICTED", "Official certified First Information Report registered at PS Connaught Place.", "u-officer", False),
            ("CASE-2026-000101", "Deposition Statement of Smt. Sunita Mehra", "WITNESS_STATEMENT", "RESTRICTED", "Audio-transcribed statement of spouse detailing last telephone contact.", "u-investigator", False),
            ("CASE-2026-000101", "CCTV Footage Log - Central Metro Station", "EVIDENCE_ITEM", "CONFIDENTIAL", "Time-stamped timestamp log and frame analysis from Exit 3.", "u-officer", False),
            ("CASE-2026-000101", "Cellular Tower Geolocation CDR Analysis", "FORENSIC_REPORT", "RESTRICTED", "Cell tower triangulation records indicating last known tower in Sector 18.", "u-forensic", False),
            ("CASE-2026-000101", "Forensic Extraction: Work Laptop ThinkPad X1", "FORENSIC_REPORT", "SEALED", "Bit-stream disk image hash and preliminary browser cache analysis.", "u-forensic", False),
            ("CASE-2026-000101", "Seizure Memo - Office Locker 4B", "EVIDENCE_ITEM", "CONFIDENTIAL", "Chain of custody seizure memo for physical notebooks and encrypted USB keys.", "u-officer", False),
            ("CASE-2026-000101", "Interim Search Warrant Authorization", "COURT_ORDER", "RESTRICTED", "Judicial order issued by Chief Metropolitan Magistrate granting residential search.", "u-clerk", False),

            # Case 102 Documents
            ("CASE-2026-000102", "FIR No. 1022/2026 Cyber Crime Intake", "FIR", "RESTRICTED", "Cyber financial complaint filed by Apex Payment Technologies Ltd.", "u-officer", False),
            ("CASE-2026-000102", "Core Banking API Request Log - Wire Divert", "EVIDENCE_ITEM", "RESTRICTED", "Server telemetry logs recording IP spoofing during settlement run 44.", "u-investigator", False),
            ("CASE-2026-000102", "CFSL Forensic Memory Dump Analysis", "FORENSIC_REPORT", "SEALED", "RAM dump report confirming malware process injected into payment gateway daemon.", "u-forensic", False),
            ("CASE-2026-000102", "Interrogation Transcript - Lead Developer", "WITNESS_STATEMENT", "CONFIDENTIAL", "Detailed Q&A session regarding unauthorized cryptographic key export.", "u-investigator", False),
            ("CASE-2026-000102", "Reserve Bank of India Suspicious Activity Report", "POLICE_REPORT", "RESTRICTED", "Financial Intelligence Unit cross-border remittance flag report.", "u-investigator", False),
            ("CASE-2026-000102", "Seizure Inventory - Cloud Server Backups", "EVIDENCE_ITEM", "RESTRICTED", "Cryptographically hashed Amazon S3 snapshot records from cloud tenant.", "u-officer", False),
            ("CASE-2026-000102", "Preliminary Charge Sheet Draft", "CHARGE_SHEET", "RESTRICTED", "Draft charges framed under IPC 420 and IT Act Section 66D.", "u-prosecutor", False),
            # TAMPERED DEMO DOCUMENT
            ("CASE-2026-000102", "[DEMO-TAMPERED] Bank Account Summary - Case 102", "EVIDENCE_ITEM", "RESTRICTED", "Simulated tampered document designed to demonstrate immediate hash mismatch detection and incident lockout.", "u-officer", True),

            # Case 103 Documents
            ("CASE-2026-000103", "FIR No. 512/2025 Certified Prosecution Copy", "FIR", "CONFIDENTIAL", "Registered criminal breach of trust case records.", "u-officer", False),
            ("CASE-2026-000103", "Forensic Audit of Source Code Repositories", "FORENSIC_REPORT", "RESTRICTED", "CFSL report establishing SHA-256 matches between exfiltrated git trees.", "u-forensic", False),
            ("CASE-2026-000103", "Formal Charge Sheet filed under IT Act 66", "CHARGE_SHEET", "RESTRICTED", "Final police report filed before High Court Bench.", "u-prosecutor", False),
            ("CASE-2026-000103", "Court Order on Bail Application Hearing", "COURT_ORDER", "CONFIDENTIAL", "Judicial order rejecting bail pending forensic cross-examination.", "u-clerk", False),
            ("CASE-2026-000103", "Judicial Examination Order & Summons", "COURT_ORDER", "RESTRICTED", "High Court direction ordering physical production of forensic exhibits.", "u-clerk", False),
            ("CASE-2026-000103", "Expert Witness Deposition - CFSL Director", "WITNESS_STATEMENT", "CONFIDENTIAL", "Verbatim court deposition transcript of CFSL Cyber Examiner.", "u-clerk", False),
        ]

        for case_id, title, doc_type, cls, desc, uploader_id, is_tampered in docs_metadata:
            doc_id = str(uuid.uuid4())
            uploader = next(u for u in users_data if u[0] == uploader_id)

            # Synthetic sample content for hashing
            sample_content = f"NYAYAVAULT SECURE ARCHIVAL EVIDENCE\nDocument: {title}\nCase: {case_id}\nType: {doc_type}\nClassification: {cls}\nTimestamp: {now.isoformat()}\n".encode("utf-8")
            real_sha256 = compute_sha256(sample_content)

            # Put in storage
            storage_key = f"docs/{case_id}/{doc_id}.vault"
            storage_ref = await storage.put_object(storage_key, sample_content, "text/plain")

            # Blockchain Anchor
            tx_receipt = await blockchain.create_document_record(
                document_id=doc_id,
                version_id=1,
                case_id=case_id,
                doc_type=doc_type,
                classification=cls,
                sha256_hash=real_sha256,
                storage_ref_hash=compute_sha256(storage_ref.encode("utf-8")),
                uploaded_by=uploader_id,
                org_id="ORG1",
                correlation_id=f"corr-seed-{doc_id[:6]}",
            )
            tx_id = tx_receipt.get("tx_id", "0x3a19b2")

            doc = Document(
                id=doc_id,
                case_id=case_id,
                title=title,
                description=desc,
                document_type=doc_type,
                classification=cls,
                current_version=1,
                status="ACTIVE",
                is_simulated_tampered=is_tampered,
                created_by_id=uploader_id,
                created_at=now - timedelta(days=5),
            )
            session.add(doc)

            version = DocumentVersion(
                document_id=doc_id,
                version_number=1,
                sha256_hash=real_sha256,
                previous_version_hash="GENESIS",
                storage_object_key=storage_key,
                file_size_bytes=len(sample_content),
                mime_type="text/plain",
                original_filename=f"{title.replace(' ', '_')[:30]}.txt",
                uploader_id=uploader_id,
                blockchain_tx_id=tx_id,
                blockchain_status="COMMITTED",
                created_at=now - timedelta(days=5),
            )
            session.add(version)

            # Custody Events (CREATED, HASHED, STORED, VERIFIED)
            c_events = [
                ("UPLOADED", "Intake and initial registration", now - timedelta(days=5)),
                ("HASHED", "Cryptographic SHA-256 fingerprint generated", now - timedelta(days=5, minutes=-2)),
                ("VIRUS_SCANNED", "ClamAV malware scan: CLEAN", now - timedelta(days=5, minutes=-3)),
                ("STORED", "Encrypted in private storage vault (AES-256-GCM)", now - timedelta(days=5, minutes=-4)),
                ("VERIFIED", "Routine blockchain hash integrity audit verified", now - timedelta(days=1)),
            ]
            for action, reason, t_stamp in c_events:
                session.add(
                    CustodyEvent(
                        case_id=case_id,
                        document_id=doc_id,
                        version_number=1,
                        action=action,
                        actor_id=uploader_id,
                        actor_name=uploader[2],
                        actor_role=uploader[3],
                        organization_name="Crime Branch / Judiciary",
                        outcome="SUCCESS",
                        reason=reason,
                        hash_reference=real_sha256,
                        blockchain_tx_id=tx_id,
                        timestamp_utc=t_stamp,
                    )
                )

        # Seed sample judicial signature on Case 103 court order
        sample_court_order = await session.execute(
            select(Document).where(Document.document_type == "COURT_ORDER").limit(1)
        )
        sample_order_doc = sample_court_order.scalar_one_or_none()
        if sample_order_doc:
            judge_sig_tx = await blockchain.record_signature_event(
                signature_id="sig-demo-01",
                document_id=sample_order_doc.id,
                version_id=1,
                signer_id="u-judge",
                signer_role="JUDGE",
                signed_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                cert_thumb="SHA256:JUDGE-DELHI-HIGH-COURT-BENCH-CA",
            )
            session.add(
                DigitalSignature(
                    id="sig-demo-01",
                    document_id=sample_order_doc.id,
                    version_number=1,
                    signer_id="u-judge",
                    signer_name="Justice S. K. Roy",
                    signer_role="JUDGE",
                    signed_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                    certificate_thumbprint="SHA256:JUDGE-DELHI-HIGH-COURT-BENCH-CA",
                    statement="I hereby attest that I have reviewed and digitally signed this judicial order in full conformity with Section 65B of the Indian Evidence Act.",
                    blockchain_tx_id=judge_sig_tx.get("tx_id"),
                    signed_at=now - timedelta(days=2),
                )
            )

        # Seed sample access request
        sample_restricted_doc = await session.execute(
            select(Document).where(Document.document_type == "FORENSIC_REPORT").limit(1)
        )
        sample_doc = sample_restricted_doc.scalar_one_or_none()
        if sample_doc:
            session.add(
                AccessRequest(
                    id="req-demo-01",
                    case_id=sample_doc.case_id,
                    document_id=sample_doc.id,
                    requester_id="u-prosecutor",
                    reason="Required for pre-trial evidentiary argument before Chief Metropolitan Magistrate.",
                    access_type="VIEW",
                    requested_expiry_days=7,
                    status="PENDING",
                    created_at=now - timedelta(hours=6),
                )
            )

        # Audit events for platform activity
        session.add(
            AuditEvent(
                actor_id="u-admin",
                actor_name="Alok Verma",
                actor_role="ADMIN",
                action="SYSTEM_INITIALIZED",
                resource_type="SYSTEM",
                outcome="SUCCESS",
                details={"version": "NyayaVault-2.0-SIH26190", "blockchain": "Hyperledger Fabric Gateway Mock"},
                timestamp_utc=now - timedelta(days=14),
            )
        )

        await session.commit()
        print("Database seeded successfully with all 8 institutional roles, 3 cases, and 21 documents!")


if __name__ == "__main__":
    asyncio.run(seed_database())
