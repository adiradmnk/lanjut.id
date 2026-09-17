package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"lanjut/backend/internal/models"
)

// CreateProductPackage inserts a new catalog entry for a tenant.
func (s *Store) CreateProductPackage(ctx context.Context, pkg models.ProductPackage) (*models.ProductPackage, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO product_packages (tenant_id, name, description, price_idr, quota_sessions, duration_days, billing_type, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id::text, tenant_id, name, description, price_idr, quota_sessions, duration_days,
		          billing_type, is_active, created_at::text, updated_at::text`,
		pkg.TenantID, pkg.Name, pkg.Description, pkg.PriceIDR, pkg.QuotaSessions, pkg.DurationDays, pkg.BillingType, pkg.IsActive)
	return scanProductPackage(row)
}

// GetProductPackage looks up a single catalog entry by id.
func (s *Store) GetProductPackage(ctx context.Context, id string) (*models.ProductPackage, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id::text, tenant_id, name, description, price_idr, quota_sessions, duration_days,
		       billing_type, is_active, created_at::text, updated_at::text
		FROM product_packages WHERE id = $1`, id)
	return scanProductPackage(row)
}

// ListProductPackages returns every catalog entry for a tenant, active or not.
func (s *Store) ListProductPackages(ctx context.Context, tenantID string) ([]models.ProductPackage, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, tenant_id, name, description, price_idr, quota_sessions, duration_days,
		       billing_type, is_active, created_at::text, updated_at::text
		FROM product_packages WHERE tenant_id = $1 ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.ProductPackage
	for rows.Next() {
		p, err := scanProductPackage(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *p)
	}
	return out, rows.Err()
}

// ListActiveProductPackages is what offer generation draws catalog candidates from.
func (s *Store) ListActiveProductPackages(ctx context.Context, tenantID string) ([]models.ProductPackage, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, tenant_id, name, description, price_idr, quota_sessions, duration_days,
		       billing_type, is_active, created_at::text, updated_at::text
		FROM product_packages WHERE tenant_id = $1 AND is_active = true ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.ProductPackage
	for rows.Next() {
		p, err := scanProductPackage(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *p)
	}
	return out, rows.Err()
}

// UpdateProductPackage overwrites every column (including toggling is_active); the caller
// merges a partial patch onto a freshly-read record before calling this.
func (s *Store) UpdateProductPackage(ctx context.Context, pkg models.ProductPackage) (*models.ProductPackage, error) {
	row := s.pool.QueryRow(ctx, `
		UPDATE product_packages
		SET name = $2, description = $3, price_idr = $4, quota_sessions = $5, duration_days = $6,
		    billing_type = $7, is_active = $8, updated_at = now()
		WHERE id = $1
		RETURNING id::text, tenant_id, name, description, price_idr, quota_sessions, duration_days,
		          billing_type, is_active, created_at::text, updated_at::text`,
		pkg.ID, pkg.Name, pkg.Description, pkg.PriceIDR, pkg.QuotaSessions, pkg.DurationDays, pkg.BillingType, pkg.IsActive)
	return scanProductPackage(row)
}

func scanProductPackage(row rowScanner) (*models.ProductPackage, error) {
	var p models.ProductPackage
	err := row.Scan(&p.ID, &p.TenantID, &p.Name, &p.Description, &p.PriceIDR, &p.QuotaSessions, &p.DurationDays,
		&p.BillingType, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan product_package: %w", err)
	}
	return &p, nil
}
