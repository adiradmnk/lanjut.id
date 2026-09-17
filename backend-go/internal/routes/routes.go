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
		api.POST("/auth/login", h.Login)
		api.POST("/auth/verify-otp", h.VerifyOTP)
		api.GET("/auth/me", h.Me)

		api.GET("/member/resolve-magic-token", h.ResolveMagicToken)
		api.POST("/member/translate-grievance", h.TranslateGrievance)
		api.POST("/member/checkout-va", h.CheckoutVA)
		api.POST("/member/checkout/:trxId/cancel", h.CancelCheckout)
		api.POST("/member/offers/:offerId/decline", h.DeclineOffer)
		api.GET("/member/invoices/:trxId", h.GetInvoice)
		api.GET("/member/invoices", h.ListMemberInvoices)
		api.GET("/member/transactions", h.ListMemberTransactions)

		api.POST("/member/feedback", h.SubmitFeedback)
		api.GET("/member/feedback", h.ListMemberFeedback)

		api.POST("/member/subscription/:id/cancel", h.CancelSubscription)
		api.POST("/member/subscription/:id/feedback", h.SubmitSubscriptionFeedback)
		api.GET("/member/receipt/:trxId", h.GetReceipt)
		api.POST("/member/receipt/:trxId/feedback", h.SubmitReceiptFeedback)
		api.POST("/member/request-human-help", h.RequestHumanHelp)

		api.GET("/merchant/:tenantId/dashboard", h.MerchantDashboard)
		api.GET("/merchant/:tenantId/at-risk-members", h.MerchantAtRiskMembers)
		api.PATCH("/merchant/:tenantId/config", h.UpdateMerchantConfig)
		api.GET("/merchant/:tenantId/churn-events", h.GetMerchantChurnEvents)
		api.GET("/merchant/:tenantId/revenue-insights", h.GetMerchantRevenueInsights)
		api.GET("/merchant/:tenantId/insights", h.GetTenantInsights)
		api.GET("/merchant/dashboard-stats", h.MerchantDashboard)
		api.GET("/merchant/members-overview", h.MerchantAtRiskMembers)

		api.POST("/merchant/:tenantId/packages", h.CreatePackage)
		api.GET("/merchant/:tenantId/packages", h.ListPackages)
		api.PATCH("/merchant/:tenantId/packages/:id", h.UpdatePackage)

		api.POST("/merchant/:tenantId/guidebook", h.UploadGuidebook)
		api.GET("/merchant/:tenantId/guidebook", h.GetGuidebook)
		api.GET("/merchant/:tenantId/guidebook/history", h.ListGuidebooks)
		api.GET("/merchant/:tenantId/business-rules", h.GetBusinessRules)

		api.GET("/merchant/:tenantId/feedback", h.ListMerchantFeedback)

		api.GET("/merchant/:tenantId/transactions", h.ListMerchantTransactions)

		api.GET("/merchant/:tenantId/pending-offers", h.ListPendingOffers)
		api.POST("/merchant/:tenantId/offers/:offerId/approve", h.ApproveOffer)
		api.POST("/merchant/:tenantId/offers/:offerId/reject", h.RejectOffer)

		api.POST("/ai/tenants/:tenantId/members/:memberId/generate-offers", h.GenerateOffers)
		api.GET("/ai/tenants/:tenantId/transaction-feed", h.ListTenantTransactionFeedForAI)

		// Frontend Merchant Tab: AI Prediction, Future Scenarios, Visual Analytics, Dataset 900
		api.POST("/merchant/churn-predict", h.PredictChurn)
		api.POST("/merchant/churn-simulate", h.SimulateChurn)
		api.GET("/merchant/churn-analytics", h.GetChurnAnalytics)
		api.GET("/merchant/dataset-900/summary", h.Dataset900Summary)
		api.GET("/merchant/dataset-900/members", h.Dataset900Members)
		api.POST("/merchant/dataset-900/run-stress-test", h.Dataset900RunStressTest)
		api.GET("/merchant/retention-logs", h.GetMerchantRetentionLogs)

		// Merchant Conversational Business Logic Chatbot
		api.POST("/merchant/:tenantId/chat-instruction", h.MerchantChatbotInstruction)

		// BNI & Payment Gateway Provider Dashboard
		api.GET("/bni/dashboard", h.BNIDashboard)
		api.GET("/bni/portfolio-health", h.GetBNIPortfolioHealth)
		api.GET("/bni/merchant-list", h.GetBNIMerchantList)
		api.GET("/bni/tenants/:tenantId/insights", h.GetTenantInsights)
	}

	r.POST("/webhook/bni-payment", h.BNIWebhook)
	r.POST("/api/bni/va-webhook", h.BNIWebhook)
	r.POST("/webhook/midtrans", h.MidtransWebhook)
}
