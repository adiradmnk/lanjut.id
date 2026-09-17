package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"lanjut/backend/internal/config"
	"lanjut/backend/internal/db"
	"lanjut/backend/internal/handlers"
	"lanjut/backend/internal/routes"
	"lanjut/backend/internal/services"
	"lanjut/backend/internal/store"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		slog.Error("failed to run migrations", "err", err)
		os.Exit(1)
	}

	s := store.New(pool)
	magicToken := services.NewMagicTokenService(cfg.MagicTokenSecret, s)
	aiGateway := services.NewAIGateway(cfg.AIServiceURL)
	bni := services.NewBNIPaymentService(cfg)
	midtrans := services.NewMidtransAdapter(cfg)
	if cfg.MidtransServerKey == "" {
		slog.Warn("Midtrans credentials not configured; MIDTRANS-provider tenants will use the local simulator")
	}

	storage, err := services.NewR2Storage(cfg)
	if err != nil {
		slog.Error("failed to init R2 storage client", "err", err)
		os.Exit(1)
	}
	if storage == nil {
		slog.Warn("R2 credentials not configured; guidebook upload endpoints will return 503")
	}

	mailjet := services.NewMailjetService(cfg)
	if mailjet == nil {
		slog.Warn("Mailjet credentials not configured; OTP login endpoints will return 503")
	}

	h := handlers.New(s, magicToken, aiGateway, bni, storage, mailjet, midtrans)

	r := gin.Default()
	routes.Register(r, h)

	slog.Info("lanjut backend listening", "port", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		slog.Error("server stopped", "err", err)
		os.Exit(1)
	}
}
