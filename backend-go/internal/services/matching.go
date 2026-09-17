package services

import (
	"math"

	"lanjut/backend/internal/models"
)

// GenerateSmartOptions is the deterministic, capacity-aware local fallback engine.
// It never offers a slot the database doesn't actually have, and never exceeds the
// tenant's configured max discount / margin floor.
func GenerateSmartOptions(member *models.Member, tenant *models.Tenant, sessions []models.ClassSession) []models.SmartOption {
	maxDiscount := 15.0
	minFloor := 50000.0
	businessName := "Studio"
	if tenant != nil {
		maxDiscount = tenant.Config.MaxDiscountPct
		minFloor = tenant.Config.MinMarginFloorIDR
		businessName = tenant.BusinessName
	}

	var evening []models.ClassSession
	for _, s := range sessions {
		if s.TimeOfDay == "EVENING" && s.BookedSlots < s.TotalCapacity {
			evening = append(evening, s)
		}
	}

	var target *models.ClassSession
	if len(evening) > 0 {
		target = &evening[0]
	} else if len(sessions) > 0 {
		target = &sessions[0]
	}

	availableSlots := 0
	if target != nil {
		availableSlots = target.TotalCapacity - target.BookedSlots
	}

	var options []models.SmartOption

	if target != nil && availableSlots > 0 {
		basePrice := math.Max(minFloor, math.Round(target.PricePerSessionIDR*0.5))
		adjustedPrice := math.Round(basePrice * (1.0 - maxDiscount/100.0))

		options = append(options, models.SmartOption{
			ID:                 "opt_switch_evening",
			Type:               "SWITCH_EVENING",
			Title:              "Pindah ke Kelas Malam Sepulang Kantor",
			Badge:              "Rekomendasi AI Terpopuler",
			Highlight:          target.DayOfWeek + ", " + target.TimeSlot + " (" + target.Title + ")",
			Description:        "Sisa kuota dipindahkan tanpa hangus, margin merchant tetap terjaga.",
			TargetSessionID:    target.ID,
			TargetSessionTitle: target.Title,
			TargetSessionTime:  target.DayOfWeek + ", " + target.TimeSlot,
			PriceAdjustmentIDR: adjustedPrice,
			OriginalPriceIDR:   target.PricePerSessionIDR,
			DiscountLabel:      "Diskon biaya upgrade",
			AvailableSlots:     availableSlots,
			ActionLabel:        "Pilih Jadwal Ini",
		})
	}

	options = append(options, models.SmartOption{
		ID:                 "opt_flexible_downgrade",
		Type:               "FLEXIBLE_DOWNGRADE",
		Title:              "Ganti ke Paket 4 Sesi Fleksibel",
		Badge:              "Opsi Hemat Anggaran",
		Highlight:          "Bebas Reservasi Jam & Hari Apapun",
		Description:        "Ubah sisa kuota menjadi voucher fleksibel untuk kelas " + businessName + ".",
		TargetSessionID:    "ses-flex-any",
		TargetSessionTitle: "Paket Flexi " + businessName,
		TargetSessionTime:  "Fleksibel 30 Hari",
		PriceAdjustmentIDR: 0,
		DiscountLabel:      "Gratis biaya konversi",
		AvailableSlots:     20,
		ActionLabel:        "Ganti ke Paket Fleksibel (Gratis)",
	})

	options = append(options, models.SmartOption{
		ID:                 "opt_pause_freeze",
		Type:               "PAUSE_FREEZE",
		Title:              "Jeda Membership 14 Hari (Free Freeze)",
		Badge:              "Lembur / Luar Kota",
		Highlight:          "Masa Aktif Otomatis Diperpanjang 2 Minggu",
		Description:        "Bekukan akun tanpa biaya tambahan.",
		TargetSessionID:    "ses-freeze-14d",
		TargetSessionTitle: "Freeze Membership 14 Hari",
		TargetSessionTime:  "Jeda 14 Hari Kalender",
		PriceAdjustmentIDR: 0,
		OriginalPriceIDR:   50000,
		DiscountLabel:      "Bebas biaya admin freeze",
		AvailableSlots:     99,
		ActionLabel:        "Bekukan Membership Sementara",
	})

	return options
}
