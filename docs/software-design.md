# Smart Event Pass - Software Design Document

## 1. Mfumo ni nini?
Smart Event Pass ni mfumo wa kidigitali wa kutengeneza E-Cards, QR Codes, na kufanya verification ya wageni kwenye matukio.

## 2. Matukio yanayolengwa
- Harusi
- Semina
- Mahafali
- Birthday
- Church Events
- Conferences
- Parties

## 3. Watumiaji wa mfumo

### Super Admin
- Anaona events zote
- Anaongeza clients
- Anaona malipo
- Ana manage mfumo wote

### Organizer
- Anatengeneza event
- Anaongeza wageni
- Anatuma invitations
- Anaona reports

### Gate Scanner
- Ana-scan QR Code
- Ana-check in wageni
- Hawezi kuona settings za admin

## 4. Pages za mfumo

### Public Pages
- Home
- Login
- Register
- Invitation Page

### Dashboard Pages
- Dashboard
- Events
- Guests
- Invitations
- Check-In
- Reports
- Settings

## 5. Database Tables

### users
- id
- name
- email
- password
- role
- created_at

### events
- id
- user_id
- title
- event_type
- bride_name
- groom_name
- date
- time
- venue
- google_map_link
- created_at

### guests
- id
- event_id
- full_name
- phone
- email
- category
- allowed_guests
- qr_code
- status
- checked_in_at
- created_at

### payments
- id
- user_id
- event_id
- amount
- payment_method
- status
- created_at

## 6. QR Code Logic
Kila mgeni atakuwa na QR Code ya kipekee.

QR ikiscan:
- Kama ipo na haijatumika: VERIFIED
- Kama imeshatumika: ALREADY CHECKED IN
- Kama haipo: INVALID QR CODE

## 7. Invitation Flow
1. Organizer anatengeneza event
2. Anaongeza wageni
3. Mfumo unatengeneza QR Code
4. Mgeni anapata link ya invitation
5. Siku ya event QR inascan mlangoni

## 8. Future Features
- WhatsApp invitation
- Email invitation
- PDF invitation
- Excel import
- M-Pesa / Airtel Money payments
- RSVP
- Gift contribution
- Reports export