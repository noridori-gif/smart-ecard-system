# Smart Event Pass - Database Design

## users
- id
- full_name
- email
- password
- role
- created_at

## events
- id
- user_id
- title
- event_type
- bride_name
- groom_name
- event_date
- event_time
- venue
- google_map_link
- status
- created_at

## guests
- id
- event_id
- full_name
- phone
- email
- category
- allowed_guests
- qr_code
- invitation_link
- status
- checked_in_at
- created_at

## check_ins
- id
- guest_id
- event_id
- checked_by
- checked_in_at
- device_name

## payments
- id
- user_id
- event_id
- amount
- payment_method
- status
- transaction_reference
- created_at