# Google Play listing — State Your Case

Everything to paste or upload in Play Console. Internal testing doesn't need the store listing, but
Play asks for the **App content** answers before the first release of any kind, and closed testing
and production need the listing too.

## Main store listing (Grow users → Store presence → Main store listing)

| Field | Value |
|---|---|
| App name (≤ 30) | State Your Case |
| App icon | `icon-512.png` (512×512, 32-bit PNG) |
| Feature graphic | `feature-graphic.jpg` (1024×500) |
| Phone screenshots | `screenshots/01…06-*.jpg` in that order (1080×2160) |
| Tablet screenshots, video | Optional — leave empty |

Paste the descriptions from `text/` (one line per paragraph); Play keeps line breaks as pasted, so
don't copy the wrapped versions below. They're here to read and proofread.

### English (en-US, default)

**Short description** (≤ 80):

> Pass the phone, pick a side and argue it. Secret objectives make it chaos.

**Full description** (≤ 4000):

> State Your Case is a party debate game for 3–8 players and a single phone.
>
> One player becomes the Discussion Moderator. They pick the topic (Coffee or energy drinks? Is it
> ever okay to lie? Was the moon landing fake?) and decide what the speeches are judged on: comedy,
> creativity, staying on topic, facts or pure enthusiasm. Everyone else splits into teams or goes
> solo, gets a side, and makes their case against the clock.
>
> But not everyone is playing fair. Before the debate the phone goes around the room, and each
> player secretly reveals their Corruption: a hidden objective worth bonus points. Say "and that's
> a fact" three times in your speech. Get the room clapping. Argue for the wrong side, then
> "correct" yourself. Ask the moderator how much time you have left – twice.
>
> Think someone is up to something? Accuse them! Name their corruption and you steal their points.
> Guess wrong and it costs you.
>
> When the talking stops, everyone votes and the scoreboard shows who argued best, and who got away
> with it. Three rounds, one winner.
>
> • 3–8 players, one phone passed around the room
> • Debate topics from silly to surprisingly deep
> • Secret objectives that turn every speech into a bluff
> • Accusations, votes and a scoreboard after every round
> • Play in English or Icelandic
> • No accounts, no ads, no internet connection needed

### Icelandic (is-IS) — please proofread

**Short description** (≤ 80):

> Sendið símann á milli, veljið hlið og rökræðið. Leyniverkefni rugla öllu.

**Full description** (≤ 4000):

> State Your Case er partýspil í rökræðum fyrir 3–8 leikmenn og einn síma.
>
> Einn leikmaður er Þingstjóri. Hann velur umræðuefnið (Kaffi eða orkudrykkir? Er stundum í lagi að
> ljúga? Var tungllendingin fölsuð?) og ákveður hvað ræðurnar eru dæmdar eftir: húmor, sköpunargáfu,
> hvort haldið sé við efnið, staðreyndir eða hreinan eldmóð. Hinir skipta sér í lið eða keppa einir,
> fá úthlutaða hlið og flytja mál sitt áður en tíminn rennur út.
>
> En ekki spila allir heiðarlega. Fyrir umræðurnar fer síminn hringinn og hver leikmaður sér sína
> Spillingu í laumi: leyniverkefni sem gefur aukastig. Segðu „og það er staðreynd“ þrisvar í
> ræðunni. Fáðu salinn til að klappa. Talaðu óvart fyrir rangri hlið og „leiðréttu“ þig svo. Spurðu
> Þingstjórann tvisvar hvað þú eigir mikinn tíma eftir.
>
> Grunar þig að einhver sé að svindla? Ásakaðu hann! Ef þú giskar rétt á spillinguna stelurðu
> stigunum hans. Ef þú giskar rangt kostar það þig.
>
> Þegar umræðunum lýkur kjósa allir og stigataflan sýnir hver stóð sig best, og hver komst upp með
> það. Þrjár umferðir, einn sigurvegari.
>
> • 3–8 leikmenn og einn sími sem gengur á milli
> • Umræðuefni allt frá kjánalegum yfir í óvænt djúpar spurningar
> • Leyniverkefni sem gera hverja ræðu að blekkingarleik
> • Ásakanir, atkvæðagreiðsla og stigatafla eftir hverja umferð
> • Spilaðu á íslensku eða ensku
> • Enginn aðgangur, engar auglýsingar og engin nettenging nauðsynleg

## Store settings (Grow users → Store presence → Store settings)

| Field | Value |
|---|---|
| App or game | Game |
| Category | Casual (Word or Trivia also fit) |
| Tags | Pick up to 5 from Play's list that fit a local party/multiplayer game |
| Email (public) | Your contact email (the privacy policy uses thorrib@live.com) |
| Website | https://giantmushy.github.io/AngryPuffinGamesSite/ |

## App content (Policy and programs → App content)

Checked against the code: the app makes no network requests, stores nothing (no `localStorage`, no
files), has no analytics, ads, accounts or purchases, and only asks for the `INTERNET` permission
(Capacitor's default). The menu's two links open in the phone's browser.

| Declaration | Answer |
|---|---|
| Privacy policy | Your policy URL — **fix it first, see below** |
| Ads | No, my app does not contain ads |
| App access | All functionality is available without special access |
| Content rating | IARC questionnaire, see below |
| Target audience | 13–15, 16–17 and 18+ (not under 13, which would bring in the Families policy). Appeals to children: No |
| News app | No |
| Data safety | Does your app collect or share any of the required user data types? **No** |
| Advertising ID | No, the app doesn't use an advertising ID |
| Government app | No |
| Financial features | None |
| Health | No health features |

### Content rating questionnaire (IARC)

Category: **Game** (all other kinds of game). Only the Classic pack is playable. The other packs
are locked in the app, including the 18+ one, so answer for the Classic topics and corruptions.
Redo the questionnaire if a new pack ships.

| Question area | Answer | Why |
|---|---|---|
| Violence, blood, fear | No | Text-only debate prompts; one hypothetical mentions a serial killer, nothing is depicted |
| Sexuality, nudity | No | One prompt debates exemptions for a nudist group; nothing sexual |
| Language | No profanity | — |
| Crude humour | Yes, mild | A prompt asks whether fart jokes are funny |
| Controlled substances | Yes: references to alcohol | Prompts mention beer at a party and a post-clubbing meal |
| Gambling (real or simulated) | No | Points are only a game score |
| Users interact or exchange content | No | Names stay on the one phone; "Online" isn't functional |
| Shares location / personal info | No | — |
| Digital purchases | No | — |
| Unrestricted internet access | No | Only two links to your own pages, opened in the browser |

Expect a low-teen-or-younger rating; IARC calculates it from these answers.

### Privacy policy: needs a fix

The current Flycricket policy is a generic template. It says the app collects IP addresses,
pages visited, time in the app and the device OS, and sends aggregated data to outside services.
The app does none of this, and Play checks the Data safety form against the policy, so the
mismatch can get a release rejected. Either regenerate it in Flycricket with "no data collected",
or host `privacy-policy.md` (in this folder) on your website and use that URL. Then update
`PRIVACY_URL` in `src/shell/Menu.tsx` if the address changes.

## Before closed testing / production

- The title screen's **Online** button leads to screens that don't work (networking was never
  built). Fine for internal testers, but Play's review can reject a production release for broken
  or misleading features. Hide it before going public.
- Personal accounts need a closed test with 12+ testers opted in for 14 days in a row before
  applying for production.
