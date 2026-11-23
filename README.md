# Winter Arc — version web

Appli de suivi sport et nutrition : muscu, cardio, sports, circuits chronométrés, base alimentaire CIQUAL, scanner de codes-barres, recettes, analyses et bilans.

Adresse : https://quentincombat-a11y.github.io/WinterArc/

- Données enregistrées sur le téléphone (IndexedDB) et sauvegardées sur Supabase avec un compte anonyme. Chaque utilisateur ne voit que ses données (voir `supabase.sql`).
- Pas d'IA dans cette version.

Sources et licences
- CIQUAL 2025 — Anses, Licence Ouverte / Open Licence 2.0 (Etalab) — https://ciqual.anses.fr/
- Open Food Facts — données sous ODbL 1.0, contenus sous DbCL 1.0 — https://openfoodfacts.org (interrogé à la demande, non redistribué)
- ZXing (lecture des codes-barres) — Apache 2.0
- supabase-js — MIT (`vendor/supabase-LICENSE.txt`)

`_source/` contient les sources de construction (`build.py`).
