/*
 * NyayaVault — Secure Digital Document Management System
 * Problem Statement ID: 26190
 *
 * Hyperledger Fabric Smart Contract (Chaincode)
 * Package: nyayavaultcc
 *
 * Implements permissioned blockchain business logic for tamper-evident
 * legal and investigation document management with verifiable chain of custody.
 *
 * CRITICAL ARCHITECTURAL PRINCIPLE:
 * No binary file contents, unencrypted sensitive PII, or storage URLs are stored on chain.
 * Only cryptographic SHA-256 integrity proofs, version anchors, custody events,
 * signature proofs, and access audit records are stored on ledger.
 */

package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// NyayaVaultContract provides functions for managing legal document integrity records
type NyayaVaultContract struct {
	contractapi.Contract
}

// DocumentAnchor defines the immutable cryptographic ledger entry for a document
type DocumentAnchor struct {
	DocumentID                 string `json:"documentId"`
	VersionID                  int    `json:"versionId"`
	CaseID                     string `json:"caseId"`
	DocumentType               string `json:"documentType"`
	Classification             string `json:"classification"`
	SHA256Hash                 string `json:"sha256Hash"`
	PreviousVersionHash        string `json:"previousVersionHash"`
	StorageObjectReferenceHash string `json:"storageObjectReferenceHash"`
	UploadedBy                 string `json:"uploadedBy"`
	OrganizationID             string `json:"organizationId"`
	TimestampUTC               string `json:"timestampUtc"`
	EventType                  string `json:"eventType"`
	SignatureReferenceHash     string `json:"signatureReferenceHash"`
	CorrelationID              string `json:"correlationId"`
	Status                     string `json:"status"` // ACTIVE, REVOKED, INCIDENT_LOCKED
}

// CustodyEventAnchor defines the tamper-evident custody event record
type CustodyEventAnchor struct {
	EventID        string `json:"eventId"`
	DocumentID     string `json:"documentId"`
	VersionID      int    `json:"versionId"`
	CaseID         string `json:"caseId"`
	Action         string `json:"action"`
	ActorID        string `json:"actorId"`
	ActorRole      string `json:"actorRole"`
	OrganizationID string `json:"organizationId"`
	TimestampUTC   string `json:"timestampUtc"`
	Outcome        string `json:"outcome"`
	ReasonHash     string `json:"reasonHash"`
	DocumentHash   string `json:"documentHash"`
	CorrelationID  string `json:"correlationId"`
}

// AccessEventAnchor defines an access grant or revocation on ledger
type AccessEventAnchor struct {
	ShareID        string `json:"shareId"`
	DocumentID     string `json:"documentId"`
	GrantedToUser  string `json:"grantedToUser"`
	AccessType     string `json:"accessType"` // VIEW, DOWNLOAD
	ExpiryUTC      string `json:"expiryUtc"`
	GrantedBy      string `json:"grantedBy"`
	Status         string `json:"status"` // ACTIVE, REVOKED, EXPIRED
	TimestampUTC   string `json:"timestampUtc"`
}

// SignatureAnchor records digital signature proof
type SignatureAnchor struct {
	SignatureID         string `json:"signatureId"`
	DocumentID          string `json:"documentId"`
	VersionID           int    `json:"versionId"`
	SignerID            string `json:"signerId"`
	SignerRole          string `json:"signerRole"`
	SignedHash          string `json:"signedHash"`
	CertificateKeyThumb string `json:"certificateKeyThumb"`
	TimestampUTC        string `json:"timestampUtc"`
}

// HashVerificationResult returns verification status from the ledger
type HashVerificationResult struct {
	DocumentID     string `json:"documentId"`
	VersionID      int    `json:"versionId"`
	RegisteredHash string `json:"registeredHash"`
	CalculatedHash string `json:"calculatedHash"`
	IsMatch        bool   `json:"isMatch"`
	Status         string `json:"status"` // VERIFIED, TAMPERED, NOT_FOUND
	TimestampUTC   string `json:"timestampUtc"`
}

// InitLedger can be called to verify ledger operational readiness
func (s *NyayaVaultContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("NyayaVault Permissioned Chaincode Initialized Successfully")
	return nil
}

// CreateDocumentRecord anchors a new legal document hash to the blockchain
func (s *NyayaVaultContract) CreateDocumentRecord(
	ctx contractapi.TransactionContextInterface,
	documentID string,
	versionID int,
	caseID string,
	docType string,
	classification string,
	sha256Hash string,
	storageRefHash string,
	uploadedBy string,
	orgID string,
	correlationID string,
) (*DocumentAnchor, error) {
	key := fmt.Sprintf("DOC_%s_V%d", documentID, versionID)
	exists, err := ctx.GetStub().GetState(key)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if exists != nil {
		return nil, fmt.Errorf("document record %s already exists", key)
	}

	txTime, err := ctx.GetStub().GetTxTimestamp()
	var timestampStr string
	if err == nil && txTime != nil {
		timestampStr = time.Unix(txTime.Seconds, int64(txTime.Nanos)).UTC().Format(time.RFC3339)
	} else {
		timestampStr = time.Now().UTC().Format(time.RFC3339)
	}

	record := DocumentAnchor{
		DocumentID:                 documentID,
		VersionID:                  versionID,
		CaseID:                     caseID,
		DocumentType:               docType,
		Classification:             classification,
		SHA256Hash:                 sha256Hash,
		PreviousVersionHash:        "GENESIS",
		StorageObjectReferenceHash: storageRefHash,
		UploadedBy:                 uploadedBy,
		OrganizationID:             orgID,
		TimestampUTC:               timestampStr,
		EventType:                  "DOCUMENT_CREATED",
		CorrelationID:              correlationID,
		Status:                     "ACTIVE",
	}

	recordBytes, err := json.Marshal(record)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(key, recordBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to put state: %v", err)
	}

	return &record, nil
}

// CreateDocumentVersion registers a new version for an existing document with hash link
func (s *NyayaVaultContract) CreateDocumentVersion(
	ctx contractapi.TransactionContextInterface,
	documentID string,
	versionID int,
	caseID string,
	docType string,
	classification string,
	sha256Hash string,
	prevHash string,
	storageRefHash string,
	uploadedBy string,
	orgID string,
	correlationID string,
) (*DocumentAnchor, error) {
	key := fmt.Sprintf("DOC_%s_V%d", documentID, versionID)
	
	txTime, err := ctx.GetStub().GetTxTimestamp()
	var timestampStr string
	if err == nil && txTime != nil {
		timestampStr = time.Unix(txTime.Seconds, int64(txTime.Nanos)).UTC().Format(time.RFC3339)
	} else {
		timestampStr = time.Now().UTC().Format(time.RFC3339)
	}

	record := DocumentAnchor{
		DocumentID:                 documentID,
		VersionID:                  versionID,
		CaseID:                     caseID,
		DocumentType:               docType,
		Classification:             classification,
		SHA256Hash:                 sha256Hash,
		PreviousVersionHash:        prevHash,
		StorageObjectReferenceHash: storageRefHash,
		UploadedBy:                 uploadedBy,
		OrganizationID:             orgID,
		TimestampUTC:               timestampStr,
		EventType:                  "VERSION_CREATED",
		CorrelationID:              correlationID,
		Status:                     "ACTIVE",
	}

	recordBytes, err := json.Marshal(record)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(key, recordBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to put version state: %v", err)
	}

	return &record, nil
}

// RecordCustodyEvent anchors an immutable custody event to the ledger
func (s *NyayaVaultContract) RecordCustodyEvent(
	ctx contractapi.TransactionContextInterface,
	eventID string,
	documentID string,
	versionID int,
	caseID string,
	action string,
	actorID string,
	actorRole string,
	orgID string,
	outcome string,
	reasonHash string,
	docHash string,
	correlationID string,
) error {
	key := fmt.Sprintf("CUSTODY_%s", eventID)

	txTime, err := ctx.GetStub().GetTxTimestamp()
	var timestampStr string
	if err == nil && txTime != nil {
		timestampStr = time.Unix(txTime.Seconds, int64(txTime.Nanos)).UTC().Format(time.RFC3339)
	} else {
		timestampStr = time.Now().UTC().Format(time.RFC3339)
	}

	event := CustodyEventAnchor{
		EventID:        eventID,
		DocumentID:     documentID,
		VersionID:      versionID,
		CaseID:         caseID,
		Action:         action,
		ActorID:        actorID,
		ActorRole:      actorRole,
		OrganizationID: orgID,
		TimestampUTC:   timestampStr,
		Outcome:        outcome,
		ReasonHash:     reasonHash,
		DocumentHash:   docHash,
		CorrelationID:  correlationID,
	}

	eventBytes, err := json.Marshal(event)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(key, eventBytes)
}

// RecordAccessEvent records an access grant or approval on the ledger
func (s *NyayaVaultContract) RecordAccessEvent(
	ctx contractapi.TransactionContextInterface,
	shareID string,
	documentID string,
	grantedToUser string,
	accessType string,
	expiryUTC string,
	grantedBy string,
) error {
	key := fmt.Sprintf("ACCESS_%s", shareID)

	txTime, err := ctx.GetStub().GetTxTimestamp()
	var timestampStr string
	if err == nil && txTime != nil {
		timestampStr = time.Unix(txTime.Seconds, int64(txTime.Nanos)).UTC().Format(time.RFC3339)
	} else {
		timestampStr = time.Now().UTC().Format(time.RFC3339)
	}

	accessEvent := AccessEventAnchor{
		ShareID:        shareID,
		DocumentID:     documentID,
		GrantedToUser:  grantedToUser,
		AccessType:     accessType,
		ExpiryUTC:      expiryUTC,
		GrantedBy:      grantedBy,
		Status:         "ACTIVE",
		TimestampUTC:   timestampStr,
	}

	bytes, err := json.Marshal(accessEvent)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(key, bytes)
}

// RevokeShare updates share status to REVOKED on ledger
func (s *NyayaVaultContract) RevokeShare(
	ctx contractapi.TransactionContextInterface,
	shareID string,
	revokedBy string,
) error {
	key := fmt.Sprintf("ACCESS_%s", shareID)
	bytes, err := ctx.GetStub().GetState(key)
	if err != nil || bytes == nil {
		return fmt.Errorf("share record %s not found", shareID)
	}

	var accessEvent AccessEventAnchor
	err = json.Unmarshal(bytes, &accessEvent)
	if err != nil {
		return err
	}

	accessEvent.Status = "REVOKED"
	updatedBytes, err := json.Marshal(accessEvent)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(key, updatedBytes)
}

// RecordSignatureEvent anchors a digital signature reference to the ledger
func (s *NyayaVaultContract) RecordSignatureEvent(
	ctx contractapi.TransactionContextInterface,
	signatureID string,
	documentID string,
	versionID int,
	signerID string,
	signerRole string,
	signedHash string,
	certThumb string,
) error {
	key := fmt.Sprintf("SIG_%s", signatureID)

	txTime, err := ctx.GetStub().GetTxTimestamp()
	var timestampStr string
	if err == nil && txTime != nil {
		timestampStr = time.Unix(txTime.Seconds, int64(txTime.Nanos)).UTC().Format(time.RFC3339)
	} else {
		timestampStr = time.Now().UTC().Format(time.RFC3339)
	}

	sig := SignatureAnchor{
		SignatureID:         signatureID,
		DocumentID:          documentID,
		VersionID:           versionID,
		SignerID:            signerID,
		SignerRole:          signerRole,
		SignedHash:          signedHash,
		CertificateKeyThumb: certThumb,
		TimestampUTC:        timestampStr,
	}

	bytes, err := json.Marshal(sig)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(key, bytes)
}

// VerifyDocumentHash performs cryptographic verification against ledger registered state
func (s *NyayaVaultContract) VerifyDocumentHash(
	ctx contractapi.TransactionContextInterface,
	documentID string,
	versionID int,
	calculatedHash string,
) (*HashVerificationResult, error) {
	key := fmt.Sprintf("DOC_%s_V%d", documentID, versionID)
	bytes, err := ctx.GetStub().GetState(key)
	if err != nil {
		return nil, fmt.Errorf("error reading ledger: %v", err)
	}
	if bytes == nil {
		return &HashVerificationResult{
			DocumentID:     documentID,
			VersionID:      versionID,
			RegisteredHash: "",
			CalculatedHash: calculatedHash,
			IsMatch:        false,
			Status:         "NOT_FOUND",
			TimestampUTC:   time.Now().UTC().Format(time.RFC3339),
		}, nil
	}

	var anchor DocumentAnchor
	err = json.Unmarshal(bytes, &anchor)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal anchor: %v", err)
	}

	isMatch := (anchor.SHA256Hash == calculatedHash)
	status := "VERIFIED"
	if !isMatch {
		status = "TAMPERED"
	}

	return &HashVerificationResult{
		DocumentID:     documentID,
		VersionID:      versionID,
		RegisteredHash: anchor.SHA256Hash,
		CalculatedHash: calculatedHash,
		IsMatch:        isMatch,
		Status:         status,
		TimestampUTC:   time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&NyayaVaultContract{})
	if err != nil {
		fmt.Printf("Error creating NyayaVault chaincode: %s\n", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting NyayaVault chaincode: %s\n", err.Error())
	}
}
