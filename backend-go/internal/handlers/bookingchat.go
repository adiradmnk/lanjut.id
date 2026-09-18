package handlers

// Rukita pre-checkout chat: lets a prospective tenant ask questions about the room they
// picked before submitting a booking, instead of the form submitting straight away. No
// session persistence — the frontend keeps the short conversation in local state and resends
// it each turn, same shape as the AI sidecar expects.

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/services"
)

type bookingChatRequest struct {
	RoomTitle    string              `json:"room_title" binding:"required"`
	RoomPriceIDR int64               `json:"room_price_idr"`
	RoomMeta     map[string]any      `json:"room_meta"`
	Message      string              `json:"message" binding:"required"`
	History      []map[string]string `json:"history"`
}

// BookingChat handles POST /api/member/rukita-chat
func (h *Handlers) BookingChat(c *gin.Context) {
	ctx := c.Request.Context()

	var req bookingChatRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Message) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "room_title and message are required"})
		return
	}

	reply, err := h.AIGateway.BookingChat(ctx, services.BookingChatInput{
		RoomTitle:    req.RoomTitle,
		RoomPriceIDR: req.RoomPriceIDR,
		RoomMeta:     req.RoomMeta,
		Message:      req.Message,
		History:      req.History,
	})
	if err != nil {
		reply = "Maaf, asisten AI sedang tidak tersedia. Silakan lanjutkan booking atau coba lagi sebentar lagi."
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "reply": reply})
}
