package store

// Merchant Analytics Query Agent sessions/messages — see
// migrations/0017_analytics_sessions.sql for the schema this backs.

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"lanjut/backend/internal/models"
)

const analyticsSessionSelectColumns = `id::text, tenant_id, title, created_at::text, updated_at::text`

func scanAnalyticsSession(row rowScanner) (*models.AnalyticsSession, error) {
	var s models.AnalyticsSession
	err := row.Scan(&s.ID, &s.TenantID, &s.Title, &s.CreatedAt, &s.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan analytics_session: %w", err)
	}
	return &s, nil
}

// CreateAnalyticsSession starts a new analytics chat session for a tenant.
func (s *Store) CreateAnalyticsSession(ctx context.Context, tenantID, title string) (*models.AnalyticsSession, error) {
	if title == "" {
		title = "Analisis Baru"
	}
	row := s.pool.QueryRow(ctx, `
		INSERT INTO analytics_sessions (tenant_id, title)
		VALUES ($1, $2)
		RETURNING `+analyticsSessionSelectColumns,
		tenantID, title)
	return scanAnalyticsSession(row)
}

// ListAnalyticsSessions returns a tenant's analytics sessions, newest first.
func (s *Store) ListAnalyticsSessions(ctx context.Context, tenantID string) ([]models.AnalyticsSession, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+analyticsSessionSelectColumns+`
		FROM analytics_sessions WHERE tenant_id = $1 ORDER BY updated_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.AnalyticsSession
	for rows.Next() {
		item, err := scanAnalyticsSession(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *item)
	}
	return out, rows.Err()
}

// GetAnalyticsSession fetches one session, scoped to its tenant so a merchant can't read
// another tenant's session by guessing an ID.
func (s *Store) GetAnalyticsSession(ctx context.Context, tenantID, sessionID string) (*models.AnalyticsSession, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT `+analyticsSessionSelectColumns+`
		FROM analytics_sessions WHERE id = $1 AND tenant_id = $2`, sessionID, tenantID)
	return scanAnalyticsSession(row)
}

// RenameAnalyticsSession sets the session title (used to auto-title after the first AI
// reply, Claude-Code-style) and bumps updated_at so it sorts to the top of the list.
func (s *Store) RenameAnalyticsSession(ctx context.Context, sessionID, title string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE analytics_sessions SET title = $2, updated_at = now() WHERE id = $1`,
		sessionID, title)
	return err
}

// touchAnalyticsSession bumps updated_at without changing the title (subsequent turns in an
// already-titled session).
func (s *Store) touchAnalyticsSession(ctx context.Context, sessionID string) error {
	_, err := s.pool.Exec(ctx, `UPDATE analytics_sessions SET updated_at = now() WHERE id = $1`, sessionID)
	return err
}

// AddAnalyticsMessage appends one turn (role "user" or "assistant") to a session.
func (s *Store) AddAnalyticsMessage(ctx context.Context, sessionID, role, content string) (*models.AnalyticsMessage, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO analytics_messages (session_id, role, content)
		VALUES ($1, $2, $3)
		RETURNING id::text, session_id::text, role, content, created_at::text`,
		sessionID, role, content)

	var m models.AnalyticsMessage
	if err := row.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
		return nil, fmt.Errorf("scan analytics_message: %w", err)
	}
	_ = s.touchAnalyticsSession(ctx, sessionID)
	return &m, nil
}

// ListAnalyticsMessages returns a session's full turn history, oldest first.
func (s *Store) ListAnalyticsMessages(ctx context.Context, sessionID string) ([]models.AnalyticsMessage, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, session_id::text, role, content, created_at::text
		FROM analytics_messages WHERE session_id = $1 ORDER BY created_at ASC`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.AnalyticsMessage
	for rows.Next() {
		var m models.AnalyticsMessage
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}
