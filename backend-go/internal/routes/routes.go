package routes

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/handlers"
)

func Register(r *gin.Engine, h *handlers.Handlers) {
	r.Use(cors.Default())

	r.GET("/health", h.Health)

	api := r.Group("/api")
	{
		api.GET("/member/resolve-magic-token", h.ResolveMagicToken)
		api.POST("/member/translate-grievance", h.TranslateGrievance)
		api.POST("/member/checkout-va", h.CheckoutVA)

		api.GET("/merchant/:tenantId/dashboard", h.MerchantDashboard)
		api.GET("/merchant/:tenantId/at-risk-members", h.MerchantAtRiskMembers)
		api.GET("/merchant/dashboard-stats", h.MerchantDashboard)
		api.GET("/merchant/members-overview", h.MerchantAtRiskMembers)

		api.GET("/bni/dashboard", h.BNIDashboard)
	}

	r.POST("/webhook/bni-payment", h.BNIWebhook)
	r.POST("/api/bni/va-webhook", h.BNIWebhook)
}
