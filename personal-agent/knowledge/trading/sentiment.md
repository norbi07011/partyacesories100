# Sentyment – Fear & Greed, social, newsy

_Źródło: MESSUAI knowledge/sentiment.ts (wyciąg tekstowy)._

SENTIMENT ANALYSIS - Fear & Greed Index, Social Sentiment
Wskaźniki sentymentu rynkowego:
- Fear & Greed Index - zagregowany wskaźnik strachu i chciwości
- Social Volume - aktywność na Twitter, Reddit
- Google Trends - zainteresowanie retail
- News Sentiment - sentyment w newsach

## Types

## Fear & Greed Index

Fear & Greed Index Components (Alternative.me):
- Volatility (25%) - VIX for crypto
- Market Momentum/Volume (25%)
- Social Media (15%)
- Dominance (10%)
- Trends (10%)
- Surveys (15%)

_Dodaj info o momentum_

## Social Sentiment

_Oblicz średni sentiment_
- ⚠️ Social sentiment zbyt bullish - możliwy local top
- 🟢 Social sentiment ekstremalnie bearish - kontrariański sygnał kupna
_Sprawdź volume spikes_
- ⚠️ …: Volume spike +…% - zwiększona uwaga retail
- ⚠️ …: Dominuje FOMO - możliwy local top
- 🟢 …: Dominuje panika - możliwe dno

## Google Trends

_Google Trends jako retail indicator_

## News Sentiment

_Key insight based on article volume_

## Overall Sentiment Analysis

_Fear & Greed (główny wskaźnik)_
- Extreme Fear = kontrariański BUY
- Extreme Greed = kontrariański SELL
_Social (secondary)_
_Check for extremes (kontrariański)_
- Social bardzo bullish - ostrożność
- Social bardzo bearish - szukaj dna
_Google Trends (retail indicator)_
- High Google Trends = retail FOMO
- Low Google Trends = retail disinterest
_Clamp score_
_Classification_
_Contrarian signal_
_Recommendation_

## Api Sources

## SENTIMENT API SOURCES

### FEAR GREED
- **Url**: https://api.alternative.me/fng/
- **Description**: Bitcoin Fear & Greed Index (free)
- **Update Frequency**: Daily

### SANTIMENT
- **Url**: https://api.santiment.net
- **Description**: Social volume, sentiment (paid)

### LUNARCRUSH
- **Url**: https://api.lunarcrush.com
- **Description**: Social media analytics (free tier available)

### THE TIE
- **Url**: https://api.thetie.io
- **Description**: News and social sentiment (enterprise)

### GOOGLE TRENDS
- **Url**: https://trends.google.com/trends/api/
- **Description**: Search interest over time
- **Note**: Unofficial API, use pytrends library

## Sentiment Rules

## SENTIMENT RULES

### FEAR GREED
- Extreme Fear (0-24) = Historycznie najlepszy moment na zakupy
- Fear (25-44) = Dobry moment na akumulację
- Greed (56-75) = Ostrożność, rozważ realizację
- Extreme Greed (76-100) = Historycznie sygnał do sprzedaży
- "Be fearful when others are greedy, greedy when others are fearful"

### SOCIAL
- Gwałtowny wzrost social volume = często local top
- Brak zainteresowania social = dno może być blisko
- FOMO na socials = końcówka ruchu w górę
- Panika na socials = końcówka ruchu w dół

### GOOGLE TRENDS
- Wysoki Google Trends + rosnący = retail FOMO = często top
- Niski Google Trends + spadający = retail disinterest = często dno
- "When your taxi driver talks about Bitcoin, sell"

### CONTRARIAN
- Sentiment jest LAGGING indicator - potwierdza, nie przepowiada
- Ekstrema sentymentu = najlepsze kontrariańskie sygnały
- Nigdy nie traduj TYLKO na podstawie sentymentu
- Sentiment + technikalia + on-chain = pełny obraz
