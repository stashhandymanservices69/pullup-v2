import { NextResponse } from 'next/server';
import { getAdminDb } from '@/app/api/_lib/firebaseAdmin';
import { sendEmail, buildSurveyEmail } from '@/app/api/_lib/resendEmail';

/**
 * Monthly Survey Cron
 * 
 * Runs on the 1st of each month at 10am AEST.
 * Sends feedback surveys to all approved cafes that have been active
 * for at least 14 days and haven't received a survey in the last 25 days.
 * 
 * Survey topics rotate monthly:
 *   - Month 1: Overall experience & feature requests
 *   - Month 2: Customer feedback & order volume
 *   - Month 3: Support quality & pricing satisfaction
 */

const SURVEY_COOLDOWN_MS = 25 * 24 * 60 * 60 * 1000; // 25 days minimum between surveys

const SURVEY_TOPICS = [
  {
    subject: 'Quick Check-In: How\'s Pull Up Working For You?',
    intro: 'We\'d love to hear how your first month with Pull Up is going.',
    questions: [
      'How would you rate the overall Pull Up experience? (1-10)',
      'What\'s your average daily order count through Pull Up?',
      'What one feature would make Pull Up even better for your business?',
      'Any issues or pain points we should know about?',
    ],
  },
  {
    subject: 'Monthly Pulse: Customer Feedback & Volume',
    intro: 'Help us understand how your customers are responding to curbside ordering.',
    questions: [
      'Have your customers given you any feedback about the Pull Up ordering experience?',
      'Has Pull Up changed your peak-hour workflow? How?',
      'What menu items sell best through Pull Up?',
      'Would you recommend Pull Up to another cafe? Why or why not?',
    ],
  },
  {
    subject: 'Quick Survey: Support & Pricing',
    intro: 'We\'re always looking to improve. Your honest feedback drives our roadmap.',
    questions: [
      'How would you rate Pull Up\'s support responsiveness? (1-10)',
      'Is the curbside fee structure fair for your business?',
      'What additional support resources would help you?',
      'Any suggestions for improving the platform?',
    ],
  },
];

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const now = Date.now();
    const cooldownCutoff = new Date(now - SURVEY_COOLDOWN_MS).toISOString();

    // Get all approved cafes
    const cafesSnap = await db
      .collection('cafes')
      .where('isApproved', '==', true)
      .get();

    // Pick survey topic based on current month (rotates 0-1-2)
    const monthIndex = new Date().getMonth() % SURVEY_TOPICS.length;
    const topic = SURVEY_TOPICS[monthIndex];

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const cafeDoc of cafesSnap.docs) {
      const cafe = cafeDoc.data();

      // Skip if no email
      if (!cafe.email) { skipped++; continue; }

      // Skip if cafe was approved less than 14 days ago
      const approvedAt = cafe.approvedAt || cafe.appliedAt;
      if (approvedAt) {
        const approvedDate = new Date(approvedAt).getTime();
        if (now - approvedDate < 14 * 24 * 60 * 60 * 1000) { skipped++; continue; }
      }

      // Skip if survey was sent recently (within cooldown)
      if (cafe.lastSurveySent && cafe.lastSurveySent > cooldownCutoff) {
        skipped++; continue;
      }

      try {
        // Build survey URL (simple mailto-based for MVP)
        const surveyReplyTo = 'feedback@pullupcoffee.com';
        const cafeName = cafe.businessName || 'Partner';

        const { html, text } = buildSurveyEmail({
          businessName: cafeName,
          intro: topic.intro,
          questions: topic.questions,
        });

        await sendEmail(cafe.email, { subject: topic.subject, html, text });

        // Update last survey timestamp
        await cafeDoc.ref.update({
          lastSurveySent: new Date().toISOString(),
          lastSurveyTopic: topic.subject,
          surveyCount: (cafe.surveyCount || 0) + 1,
        });

        sent++;
      } catch (err) {
        console.error(`Failed to send survey to ${cafeDoc.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      errors,
      totalCafes: cafesSnap.size,
      topic: topic.subject,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Survey cron error:', error);
    return NextResponse.json({ error: 'Survey cron failed' }, { status: 500 });
  }
}
