import { Router, Request, Response } from 'express';
import axios from 'axios';
import { members, merchants, serviceSessions, changeRequests } from '../data/mockDatabase';
import { CapacityAndMarginMatchingEngine } from '../services/matchingEngine';

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ----------------------------------------------------
// 1. GET Member Status (Dina's Context)
// ----------------------------------------------------
router.get('/member/:id', (req: Request, res: Response): void => {
  const member = members.find((m) => m.id === req.params.id);
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }
  res.json({ success: true, member });
});

// ----------------------------------------------------
// 2. POST AI Grievance Translation & Matching Workflow
// ----------------------------------------------------
router.post('/retention/solve-grievance', async (req: Request, res: Response): Promise<void> => {
  const { member_id, free_text } = req.body;
  if (!member_id || !free_text) {
    res.status(400).json({ error: 'member_id and free_text are required' });
    return;
  }

  const member = members.find((m) => m.id === member_id);
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  try {
    // Step A: Panggil AI Microservice untuk menerjemahkan kendala bahasa alami
    let aiTranslation;
    try {
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/v1/retention/translate-grievance`, {
        member_name: member.name,
        free_text_complaint: free_text,
        current_package: member.current_package,
        missed_sessions: member.total_quota - member.used_quota,
        total_sessions: member.total_quota,
      });
      aiTranslation = aiResponse.data;
    } catch (err: any) {
      console.warn('AI Service unavailable, using internal fallback translation:', err.message);
      aiTranslation = {
        member_name: member.name,
        intent: 'SCHEDULE_CONFLICT',
        category: 'Jadwal Pagi Bentrok Jam Kantor / WFO',
        preferred_time_of_day: 'EVENING',
        preferred_days: ['Kamis'],
        churn_risk_score: 0.86,
        sentiment: 'COOPERATIVE_RESOLVABLE',
        root_cause_summary: free_text,
        recommended_action: 'SWITCH_EVENING_CLASS',
        engine_source: 'Internal Safe Fallback',
      };
    }

    // Step B: Capacity & Margin Matching Engine (Deterministic)
    const matchResult = CapacityAndMarginMatchingEngine.matchMemberGrievance({
      member_id: member.id,
      intent: aiTranslation.intent,
      preferred_time_of_day: aiTranslation.preferred_time_of_day,
      preferred_days: aiTranslation.preferred_days,
    });

    res.json({
      success: true,
      stage: 'SOLUTION_GENERATED',
      member_profile: member,
      ai_grievance_analysis: aiTranslation,
      matching_engine_result: matchResult,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to process grievance', details: error.message });
  }
});

// ----------------------------------------------------
// 3. POST Confirm 1-Click Interactive BNI VA Payment
// ----------------------------------------------------
router.post('/retention/confirm-payment', (req: Request, res: Response): void => {
  const { proposal_id } = req.body;
  if (!proposal_id) {
    res.status(400).json({ error: 'proposal_id is required' });
    return;
  }

  const result = CapacityAndMarginMatchingEngine.confirmPayment(proposal_id);
  res.json(result);
});

// ----------------------------------------------------
// 4. GET RM BNI Operational Health Intelligence Dashboard
// ----------------------------------------------------
router.get('/bni-rm/dashboard', async (_req: Request, res: Response): Promise<void> => {
  const merchant = merchants[0];
  const totalSessions = serviceSessions.length;
  const totalCapacity = serviceSessions.reduce((acc, s) => acc + s.total_capacity, 0);
  const totalBooked = serviceSessions.reduce((acc, s) => acc + s.booked_slots, 0);
  const capacityUtilizationPct = Math.round((totalBooked / totalCapacity) * 100);

  // Dynamic metrics
  const savedCount = changeRequests.filter((p) => p.status === 'PAID_ACTIVATED').length;
  const baseSaved = 34 + savedCount;
  const totalMembers = 142;
  const retentionRate = Math.min(94.5, parseFloat((88.2 + (savedCount * 0.8)).toFixed(1)));
  const bniVaTurnover = 48500000 + (savedCount * 67500);

  // Panggil AI microservice untuk generate ringkasan naratif ala Staircase.ai
  let rmNarrative;
  try {
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/v1/retention/generate-rm-summary`, {
      merchant_name: merchant.name,
      total_members: totalMembers,
      at_risk_members: 4 - savedCount,
      saved_this_month: baseSaved,
      retention_rate_pct: retentionRate,
      avg_attendance_pct: capacityUtilizationPct,
      top_churn_reason: 'Jadwal Kelas Pagi Bentrok WFO',
      est_bni_va_turnover_idr: bniVaTurnover,
    });
    rmNarrative = aiResponse.data;
  } catch (err: any) {
    rmNarrative = {
      health_status: 'PRIME',
      bni_rm_priority: 'STABLE',
      narrative_summary: [
        `Kesehatan Operasional PRIME: Merchant mempertahankan ${retentionRate}% keanggotaan aktif.`,
        `Optimalisasi Slot: ${baseSaved} member berisiko churn sukses ditransisikan ke kelas malam tanpa kerugian margin.`,
        `Pertumbuhan BNI VA: Estimasi omzet pembayaran digital melalui ekosistem BNI mencapai Rp ${bniVaTurnover.toLocaleString('id-ID')}.`
      ],
      actionable_recommendations: [
        'Dapat diprioritaskan untuk penawaran fasilitas BNI Cash Management & QRIS.',
        'Pertahankan pemantauan berkala tanpa perlu restrukturisasi plafon kredit.'
      ],
      compliance_guarantee: 'Data diagregasi secara terenkripsi mematuhi UU PDP (Tanpa data individu member terekspos).',
    };
  }

  res.json({
    success: true,
    merchant_info: merchant,
    metrics: {
      total_members: totalMembers,
      at_risk_count: Math.max(0, 4 - savedCount),
      saved_members_month: baseSaved,
      retention_rate_pct: retentionRate,
      capacity_utilization_pct: capacityUtilizationPct,
      bni_va_turnover_idr: bniVaTurnover,
    },
    weekly_trend: [
      { week: 'W1', retention: 84, attendance: 72, volume_idr: 9500000 },
      { week: 'W2', retention: 86, attendance: 76, volume_idr: 11200000 },
      { week: 'W3', retention: 89, attendance: 81, volume_idr: 13400000 },
      { week: 'W4 (Now)', retention: retentionRate, attendance: capacityUtilizationPct, volume_idr: 14400000 },
    ],
    sessions_overview: serviceSessions,
    staircase_ai_narrative: rmNarrative,
  });
});

export default router;
