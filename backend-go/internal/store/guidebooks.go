package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"lanjut/backend/internal/models"
)

const guidebookSelectColumns = `
	id::text, tenant_id, filename, r2_key, COALESCE(r2_url, ''), COALESCE(content_type, ''),
	size_bytes, COALESCE(extracted_text, ''), extraction_status, is_current, uploaded_at::text`

// NewGuidebookInput is what CreateGuidebook needs to record a freshly-uploaded document.
type NewGuidebookInput struct {
	TenantID         string
	Filename         string
	R2Key            string
	R2URL            string
	ContentType      string
	SizeBytes        int64
	ExtractedText    string
	ExtractionStatus string
}

// CreateGuidebook records a new upload and marks it as the tenant's current guidebook,
// demoting any previous one. Both writes happen in the same transaction so there's never a
// moment with zero or two "current" guidebooks for a tenant.
func (s *Store) CreateGuidebook(ctx context.Context, in NewGuidebookInput) (*models.Guidebook, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		UPDATE guidebooks SET is_current = false WHERE tenant_id = $1 AND is_current = true`,
		in.TenantID); err != nil {
		return nil, fmt.Errorf("demote previous guidebook: %w", err)
	}

	row := tx.QueryRow(ctx, `
		INSERT INTO guidebooks (tenant_id, filename, r2_key, r2_url, content_type, size_bytes,
		                        extracted_text, extraction_status, is_current)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
		RETURNING `+guidebookSelectColumns,
		in.TenantID, in.Filename, in.R2Key, in.R2URL, in.ContentType, in.SizeBytes, in.ExtractedText, in.ExtractionStatus)

	gb, err := scanGuidebook(row)
	if err != nil {
		return nil, fmt.Errorf("insert guidebook: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return gb, nil
}

// GetCurrentGuidebook returns the tenant's active guidebook, if one has been uploaded.
func (s *Store) GetCurrentGuidebook(ctx context.Context, tenantID string) (*models.Guidebook, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT `+guidebookSelectColumns+`
		FROM guidebooks WHERE tenant_id = $1 AND is_current = true`, tenantID)
	return scanGuidebook(row)
}

// ListGuidebooks returns every guidebook ever uploaded for a tenant, newest first.
func (s *Store) ListGuidebooks(ctx context.Context, tenantID string) ([]models.Guidebook, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+guidebookSelectColumns+`
		FROM guidebooks WHERE tenant_id = $1 ORDER BY uploaded_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.Guidebook
	for rows.Next() {
		gb, err := scanGuidebook(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *gb)
	}
	return out, rows.Err()
}

func scanGuidebook(row rowScanner) (*models.Guidebook, error) {
	var gb models.Guidebook
	err := row.Scan(&gb.ID, &gb.TenantID, &gb.Filename, &gb.R2Key, &gb.R2URL, &gb.ContentType,
		&gb.SizeBytes, &gb.ExtractedText, &gb.ExtractionStatus, &gb.IsCurrent, &gb.UploadedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan guidebook: %w", err)
	}
	return &gb, nil
}
