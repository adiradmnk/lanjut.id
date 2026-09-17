package services

import (
	"context"
	"fmt"
	"io"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"lanjut/backend/internal/config"
)

// R2Storage is a thin wrapper around Cloudflare R2's S3-compatible API (via minio-go).
// The bucket is private by default: PutObject returns the object key, and callers fetch
// bytes back through this service rather than a public URL, unless R2PublicBaseURL is set.
type R2Storage struct {
	client     *minio.Client
	bucketName string
	publicBase string
}

// NewR2Storage builds a client pointed at Cloudflare R2's account-scoped S3 endpoint
// (https://<account_id>.r2.cloudflarestorage.com). Returns (nil, nil) if R2 credentials
// aren't configured, so callers can treat guidebook upload as an optional feature rather
// than a hard startup dependency.
func NewR2Storage(cfg config.Config) (*R2Storage, error) {
	if cfg.R2AccountID == "" || cfg.R2AccessKeyID == "" || cfg.R2SecretKey == "" {
		return nil, nil
	}

	endpoint := fmt.Sprintf("%s.r2.cloudflarestorage.com", cfg.R2AccountID)
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.R2AccessKeyID, cfg.R2SecretKey, ""),
		Secure: true,
		Region: "auto",
	})
	if err != nil {
		return nil, fmt.Errorf("create r2 client: %w", err)
	}

	return &R2Storage{client: client, bucketName: cfg.R2BucketName, publicBase: cfg.R2PublicBaseURL}, nil
}

// Upload puts an object under key and returns a reference URL. If R2PublicBaseURL is
// configured (a custom domain or r2.dev URL bound to the bucket), that's used; otherwise
// the reference is just the bucket-relative key, and callers must fetch bytes back via
// Download rather than treat it as a browsable link.
func (r *R2Storage) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error) {
	_, err := r.client.PutObject(ctx, r.bucketName, key, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("r2 put object: %w", err)
	}

	if r.publicBase != "" {
		return fmt.Sprintf("%s/%s", r.publicBase, key), nil
	}
	return key, nil
}

// Download fetches an object's bytes back from R2 by key.
func (r *R2Storage) Download(ctx context.Context, key string) ([]byte, error) {
	obj, err := r.client.GetObject(ctx, r.bucketName, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("r2 get object: %w", err)
	}
	defer obj.Close()

	data, err := io.ReadAll(obj)
	if err != nil {
		return nil, fmt.Errorf("read r2 object: %w", err)
	}
	return data, nil
}
