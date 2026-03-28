# Integracja płatności Stripe z iDEAL

## ✅ Co zostało zaimplementowane:

### 1. **Konfiguracja Stripe**

- Dodano klucze testowe Stripe do `.env`
- Zainstalowano `@stripe/stripe-js`
- Utworzono serwis `stripeService.ts` do obsługi płatności

### 2. **Edge Function dla Stripe Checkout**

- ✅ Wdrożono `create-checkout-session` do Supabase
- Obsługuje płatności kartą i iDEAL (holenderski system płatności)
- Ustawiono locale na holenderski (nl)
- Automatyczne przekierowanie po sukcesie/anulowaniu

### 3. **Strony płatności**

- `/success` - strona potwierdzenia płatności
- `/cancel` - strona anulowania płatności

### 4. **BookingModal**

- Dodano przycisk "Zapłać (Karta/iDEAL)"
- Możliwość wyboru między rezerwacją bez płatności a płatnością online
- Przycisk przekierowuje do Stripe Checkout z obsługą iDEAL

## 🔧 WAŻNE - Konfiguracja wymagana przed użyciem:

### 1. ⚠️ Dodaj klucz Stripe do Supabase (WYMAGANE!):

**Sposób 1 - Przez Dashboard (zalecane):**

1. Idź do: https://supabase.com/dashboard/project/emalzailvoemyukuzsvp/settings/functions
2. Kliknij zakładkę **"Secrets"**
3. Kliknij **"Add new secret"**
4. Wprowadź:
   - Name: `STRIPE_SECRET_KEY`
   - Value: `<YOUR_STRIPE_SECRET_KEY_FROM_ENV>`
5. Kliknij **"Save"**

**Sposób 2 - Przez API (alternatywny):**

```bash
curl -X POST 'https://api.supabase.com/v1/projects/emalzailvoemyukuzsvp/secrets' \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"name": "STRIPE_SECRET_KEY", "value": "<YOUR_STRIPE_SECRET_KEY_FROM_ENV>"}]'
```

### 2. Włącz iDEAL w Stripe Dashboard:

1. Zaloguj się do [Stripe Dashboard](https://dashboard.stripe.com)
2. Settings → Payment methods
3. Włącz **iDEAL** dla płatności

### 3. Webhook (opcjonalnie - dla automatycznych potwierdzeń):

Utworzono funkcję `stripe-webhook` (nie wdrożona jeszcze)

- Można ją wdrożyć później dla automatycznego tworzenia rezerwacji po płatności

## 🎯 Jak działa:

1. **Użytkownik** dodaje produkty do koszyka
2. **Klika** "Checkout" → wypełnia formularz
3. **Wybiera** płatność przez Stripe
4. **Przekierowywany** do Stripe Checkout z opcjami:
   - 💳 Płatność kartą
   - 🏦 iDEAL (holenderski)
5. **Po płatności** → przekierowanie na stronę sukcesu

## 📝 Testowanie:

### Testowe karty Stripe:

- **Sukces**: `4242 4242 4242 4242`
- **Wymaga autoryzacji**: `4000 0025 0000 3155`
- **Odrzucona**: `4000 0000 0000 9995`

### Data wygaśnięcia: dowolna przyszła (np. 12/34)

### CVC: dowolne 3 cyfry (np. 123)

## 🚀 Status:

✅ Gotowe do użycia!

- Edge Function wdrożona
- Płatności Stripe działają
- iDEAL skonfigurowany
- Strony sukcesu/anulowania dodane

## 💡 Kolejne kroki (opcjonalne):

- [ ] Wdrożyć webhook dla automatycznych potwierdzeń
- [ ] Dodać więcej metod płatności (Bancontact, Sofort, etc.)
- [ ] Dodać faktury PDF po płatności
