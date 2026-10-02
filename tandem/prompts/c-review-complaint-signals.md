TASK: review-complaint signals.

Find 10 home-service trade businesses in the geography above with recent (last 90 days) Google reviews of 1-2 stars, or 3-star reviews, that mention phone problems, no response, slow response, waiting, scheduling trouble, or poor communication. Do NOT name or quote reviewers. Describe only the business-problem category, using exactly one of these categories: phone problems, missed calls, no response, no callback, slow response, waiting, scheduling trouble, poor communication.

For EACH business you considered, including ones you reject, output a numbered entry with all of these labeled fields:

Business: <name>
Town: <town>
Trade: <trade>
Problem category: <one category from the list above>
Review timing: <when the 1, 2, or 3 star review was posted: exact date, or N days/weeks/months ago>
Review rating: <1, 2, or 3: the actual low star rating, not the business average>
Verification: <how you verified the business exists right now: Google Business Profile, own website, or Facebook page>
Classification: <exactly one of: VALID, INSUFFICIENT_EVIDENCE, OUT_OF_GEOGRAPHY, DUPLICATE, STALE_REVIEW, WRONG_TRADE, WRONG_SIGNAL, BUSINESS_NOT_VERIFIED, CONTRADICTED>

Rules: the cited review must be dated within the last 90 days. If you cannot date it, classify INSUFFICIENT_EVIDENCE, never VALID. A review older than 90 days is STALE_REVIEW. A business-average rating is not a review rating. List every candidate you considered and never silently drop one. Numbered list.
