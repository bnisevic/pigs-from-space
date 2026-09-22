# Pigs from Space (Свиње из свемира) 🐷🚀

Arkadna pucačina u stilu *Space Invaders*. Svemirske svinje su se spustile
iz orbite i hoće da pojedu farmu. Ti si poslednja linija odbrane u raketi.

Sav tekst u igri je na srpskoj ćirilici. Igra je jedan HTML fajl + jedan JS fajl. Nema instalacije, nema zavisnosti,
nema slika ni zvučnih fajlova: sva grafika je piksel-art nacrtan iz koda,
a zvuk je sintetizovan preko Web Audio API-ja.

## Pokretanje

Najjednostavnije: otvori `index.html` u browseru (dvoklik).

Ili preko lokalnog servera (preporučeno za telefon na istoj mreži):

```bash
cd pigs-from-space
python3 -m http.server 8000
```

pa otvori http://localhost:8000

## Kontrole

| Taster            | Radnja               |
|-------------------|----------------------|
| ← → ili A / D     | kretanje             |
| Space / W / ↑     | pucanje              |
| P ili Esc         | pauza                |
| M                 | isključi/uključi zvuk|

Na telefonu se prikazuju dugmad na ekranu (◀ ▶ ПУЦАЈ i pauza).

## Kako se igra

- Svinje se kreću levo-desno i spuštaju se na svakoj ivici. Što ih je manje,
  to su brže.
- Svinje bacaju blato. Blato te ubija, a i grize bale sena koje te štite.
- Svinje koje stignu do sena ga pojedu. Ako stignu do tebe, farma je izgubljena.
- Imaš 3 života, plus dodatni na svakih 10.000 poena.

Vrste svinja:

| Svinja                  | Pogodaka | Poeni    | Pojavljuje se od |
|-------------------------|----------|----------|------------------|
| Roze svinja             | 1        | 10       | talas 1          |
| Divlja svinja (braon)   | 2        | 20       | talas 2          |
| Vanzemaljska (zelena)   | 3        | 30       | talas 4          |
| NLO komandant           | 1        | 100–300  | povremeno prelazi vrh ekrana |

Svaki očišćen talas donosi bonus od `100 × broj talasa` poena. Rekord se
čuva u browseru (`localStorage`).

## Struktura

```
pigs-from-space/
├── index.html   markup, dugmad za touch, učitavanje fonta
├── style.css    raspored i stil dugmadi
├── game.js      cela igra (sprajtovi, zvuk, logika, crtanje)
└── README.md
```

U `game.js` su redom: konstante, palete i piksel-mape sprajtova, zvučni
modul, stanje igre, barijere, tok igre (talasi, smrt, game over),
ažuriranje, crtanje, ulaz i glavna petlja.

## Ideje za dalje

- Šef svinja (boss) na svakih 5 talasa
- Power-up-ovi koji padaju iz pogođenih svinja (dupli laser, štit)
- Tabela rekorda sa imenima
- Muzika u pozadini
