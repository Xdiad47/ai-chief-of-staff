import logging
from datetime import date, datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from google.cloud import firestore

from services.email_service import send_smtp_email, smtp_is_configured

logger = logging.getLogger(__name__)


def _parse_due_date(raw_due_date: object) -> Optional[date]:
    if not raw_due_date:
        return None
    if isinstance(raw_due_date, datetime):
        return raw_due_date.date()
    if isinstance(raw_due_date, date):
        return raw_due_date
    if isinstance(raw_due_date, str):
        text = raw_due_date.strip()
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(text, fmt).date()
            except ValueError:
                continue
    return None


async def run_task_reminders_for_company(company_id: str, db: firestore.Client) -> dict:
    """
    3-phase smart reminder per task (each phase sent exactly once):

      T-1  due == tomorrow          → "Your task is due tomorrow"
      T    due == today             → "Your task is due today"
      T+   due < today, not done    → "You missed the deadline — bonus points forfeited" (one-time, final)

    Flags stored on the Firestore task document prevent re-sending.
    """
    if not smtp_is_configured():
        logger.warning("[reminders] SMTP not configured — skipping company %s", company_id)
        return {"company_id": company_id, "skipped": "smtp_not_configured"}

    now_ist = datetime.now(ZoneInfo("Asia/Kolkata"))
    today = now_ist.date()
    tomorrow = today + timedelta(days=1)

    sent = 0
    failed = 0
    skipped_already_sent = 0
    skipped_no_email = 0

    try:
        employees = db.collection(f"companies/{company_id}/employees").stream()
        for emp_doc in employees:
            emp_data = emp_doc.to_dict() or {}
            employee_name = (emp_data.get("name") or "Employee").strip()
            employee_email = (emp_data.get("email") or "").strip()

            if not employee_email:
                skipped_no_email += 1
                continue

            tasks = emp_doc.reference.collection("tasks").stream()
            for task_doc in tasks:
                task = task_doc.to_dict() or {}

                if str(task.get("status") or "open").lower() == "done":
                    continue

                due = _parse_due_date(task.get("due_date"))
                if due is None:
                    continue

                title = task.get("title") or "Untitled task"
                priority = str(task.get("priority") or "medium").title()

                subject = None
                body = None
                flag_updates: dict = {}

                if due == tomorrow and not task.get("reminder_day_before_sent"):
                    subject = f"Reminder: '{title}' is due tomorrow"
                    body = (
                        f"Hello {employee_name},\n\n"
                        f"This is a heads-up that your task is due tomorrow.\n\n"
                        f"Task: {title}\n"
                        f"Priority: {priority}\n"
                        f"Due date: {due.isoformat()}\n\n"
                        "Please make sure it's completed on time to earn your bonus points.\n\n"
                        "Regards,\nAI Chief of Staff"
                    )
                    flag_updates["reminder_day_before_sent"] = True

                elif due == today and not task.get("reminder_due_today_sent"):
                    subject = f"Due Today: '{title}'"
                    body = (
                        f"Hello {employee_name},\n\n"
                        f"Your task is due today. Don't forget to complete it!\n\n"
                        f"Task: {title}\n"
                        f"Priority: {priority}\n"
                        f"Due date: {due.isoformat()}\n\n"
                        "Complete it today to secure your bonus points.\n\n"
                        "Regards,\nAI Chief of Staff"
                    )
                    flag_updates["reminder_due_today_sent"] = True

                elif due < today and not task.get("reminder_overdue_final_sent"):
                    # One-time final notice — never re-sent after this
                    subject = f"Overdue: '{title}' — Bonus Points Forfeited"
                    body = (
                        f"Hello {employee_name},\n\n"
                        f"Your task was not completed by its due date.\n\n"
                        f"Task: {title}\n"
                        f"Priority: {priority}\n"
                        f"Due date: {due.isoformat()}\n"
                        f"Current status: {str(task.get('status') or 'open').title()}\n\n"
                        "As per company policy, the performance bonus points linked to this task "
                        "will not be awarded since it was not completed on time.\n\n"
                        "Please reach out to your manager if you have any questions.\n\n"
                        "Regards,\nAI Chief of Staff"
                    )
                    flag_updates["reminder_overdue_final_sent"] = True

                if subject and body:
                    ok = await send_smtp_email(to=employee_email, subject=subject, body=body)
                    if ok:
                        task_doc.reference.update(flag_updates)
                        sent += 1
                        logger.info("[reminders] Sent '%s' to %s (%s)", subject, employee_email, company_id)
                    else:
                        failed += 1
                        logger.warning("[reminders] Failed to send to %s for task '%s'", employee_email, title)
                else:
                    skipped_already_sent += 1

    except Exception as exc:
        logger.error("[reminders] Error processing company %s: %s", company_id, exc)
        raise

    return {
        "company_id": company_id,
        "date": today.isoformat(),
        "sent": sent,
        "failed": failed,
        "skipped_already_sent": skipped_already_sent,
        "employees_missing_email": skipped_no_email,
    }


async def run_task_reminders_all_companies(db: firestore.Client) -> list[dict]:
    """Run smart reminders for every company in Firestore."""
    results = []
    try:
        companies = db.collection("companies").stream()
        for company_doc in companies:
            try:
                result = await run_task_reminders_for_company(company_doc.id, db)
                results.append(result)
            except Exception as exc:
                logger.error("[reminders] Skipping company %s due to error: %s", company_doc.id, exc)
                results.append({"company_id": company_doc.id, "error": str(exc)})
    except Exception as exc:
        logger.error("[reminders] Failed to list companies: %s", exc)
    return results
