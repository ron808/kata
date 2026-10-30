// Generated from the ideation run: 16 ideators → 96 ideas → 16 concepts, scored by a 3-judge panel.
// Scores are weighted: wow 25%, fit 20%, retention 20%, growth 15%, feasibility 10%, safety 10%.

export interface Concept {
  id: string;
  rank: number;
  title: string;
  subtitle: string;
  /** Route under /lab when a prototype was built. */
  slug: string | null;
  score: number;
  scores: Record<"wow" | "fit" | "retention" | "growth" | "feasibility" | "safety", number>;
  pitch: string;
  wow: string;
  how: string;
  social: string;
  privacy: string;
  risks: string;
  lenses: string[];
}

export const CONCEPTS: Concept[] = [
  {
    "id": "circles",
    "rank": 1,
    "title": "Circles",
    "subtitle": "a Sunday letter to the few",
    "slug": "circles",
    "score": 8.43,
    "scores": {
      "wow": 8.7,
      "fit": 9.7,
      "retention": 9,
      "growth": 8,
      "feasibility": 6.3,
      "safety": 7
    },
    "pitch": "A private circle of up to 12 people (old flatmates, a family across three countries, a study group) where each person keeps their own private page, offers one line a day, and on Sunday Kata writes one letter to the whole circle.",
    "wow": "A family spread across three countries gets its first circle letter, and it notices what nobody said out loud: all four of them wrote about being tired on Wednesday, and Grandma's emailed line was 'I made the dal you all like.' The family group chat lights up with screenshots of it.",
    "how": "You create a circle, name it ('The Rao family', 'Thursday Writers') and invite people by link. In the builder, any field can get a small circle toggle, for example mood or a 'one line for my people' short text, with a live 'what your circle sees' preview. When you seal today's page, your hanko is stamped into the circle's evening row and only the toggled fields appear under it. Friends can tuck one margin note beside your line that only you see. Each week every member can add one intention to the circle's to-do strip, and it gets their seal when it is kept. On Sunday Kata writes a circle letter from offered lines only, quoting them word for word with credit ('Mum planted the tomatoes the same day Arjun shipped his app'). Members can preview the letter and strike lines until a Saturday-night cutoff, and each can send one reply that appears in next week's letter. There are three modes. Hearth is for families: kids use PIN profiles, grandparents get an evening email and their reply becomes their line, and on the 1st there is a monthly 'Chronicle'. A season circle shares one form for 30, 66 or 100 days and ends in a bound scroll. A relay week passes a single notebook around, Renga-style, and each holder writes a page that answers the last line before it. At year end the circle almanac can be printed as a zine.",
    "social": "Small, closed, symmetric groups with a hard cap of 12. You follow a group, not a feed. The only responses are private margin notes and one reply per weekly letter, which never turns into a thread. A shared almanac shows ink density by how many members wrote, never a ranking. One person creates the circle and brings 3 to 11 people with them.",
    "privacy": "Every field is private and every circle is empty by default. Nothing is offered until you toggle it for that day. The letter prompt never sees private fields and never infers from them. Margin notes are visible only to the line's author. Leaving a circle withdraws your lines from future views and letters, and a monthly reminder lists which fields are circle-visible.",
    "risks": "Absent seals can turn into guilt or surveillance, so the letter never names who missed a day, resting days get a grey seal, and members are never compared. The LLM could misattribute or over-interpret a line, so it quotes verbatim and members can veto before Saturday. A vulnerable line can be screenshotted, so a 'shared with 6 people' reminder shows when offering. Children's data in Hearth needs parental consent and no AI processing without opt-in. Email ingest needs spoof protection. Cost is one LLM call per circle per week.",
    "lenses": [
      "graph",
      "memories",
      "ai",
      "irl",
      "formats",
      "privacy",
      "business",
      "intentions",
      "together",
      "craft",
      "growth"
    ]
  },
  {
    "id": "sunday-post",
    "rank": 2,
    "title": "The Sunday Post",
    "subtitle": "follow a person, not a feed",
    "slug": "sunday-post",
    "score": 7.43,
    "scores": {
      "wow": 7.3,
      "fit": 8.7,
      "retention": 7.3,
      "growth": 7.3,
      "feasibility": 7,
      "safety": 6
    },
    "pitch": "Following someone on Kata means subscribing to their Sunday postcard, one sealed, hand-trimmed page of their week, and friends can write each other slow letters that arrive only on Sunday morning, beside Kata's own.",
    "wow": "Sunday morning: Kata's letter on top, and under it a fanned stack of wax-sealed envelopes. One is postmarked Lisbon, from a friend you haven't spoken to in a year, who wrote because your slip reminded them of you.",
    "how": "On Sunday, the same pass that writes your weekly letter drafts your postcard: 3 to 5 lines Kata picked from your pages, your mood strip and a 'word of the week'. You strike lines out, add a sentence, then press your hanko to send it, or skip the week. Your followers find it in a Mailbox as a sealed envelope stamped with your personal seal, and a tap breaks the seal. They can send back one 'reply in the margin' that only you see. Slow Mail: from any page you can quote a line into a full letter composer and address it to a friend or to any email address. Letters wait in an outgoing tray marked 'Sealed until Sunday', and you can edit or burn them until Saturday midnight. Stamps are earned one per written day, and letters to another continent spend an extra Sunday 'in transit', with a postmark trail. Letter Slips: highlight a passage of Kata's letter to you and 'cut a slip', a paper card with your seal that is auto-redacted and previewed before it leaves. You share it as a link with an Open Graph image. Recipients see 'Write back to them' and 'Begin your own book'.",
    "social": "Following is asymmetric and approval-based (Follow{status: pending|accepted}), and the weekly cadence is the only publishing slot. No follower counts, no view counts, no read receipts, no threads, just a shoebox of letters for each person. Stamps make every message deliberate. Slips and letters to non-users pull people in as writers, not viewers, because the only action in an invite is to write back.",
    "privacy": "By default nothing is shared and you have no followers. You approve every follower, and each postcard is a draft you have to seal by hand. Only the lines you leave in go out. Postcards can be unsent within 24 hours. Strangers can't write to you unless you turn on 'accept letters', and a first letter from a non-friend lands in a separate tray. Slips are noindex and can expire or be revoked.",
    "risks": "The AI could suggest a sensitive line, so postcards default to sparse and nothing ships without review. Harassment by letter is slowed but still possible, so correspondence requests must be accepted, blocking is one tap, and you can report before opening. An empty mailbox at the start, so seed it with invite links and a postcard from Kata. Email deliverability. A week's delay will frustrate chat-minded users, which is intended but needs explaining.",
    "lenses": [
      "graph",
      "growth",
      "contrarian"
    ]
  },
  {
    "id": "sealed-capsules",
    "rank": 3,
    "title": "Sealed",
    "subtitle": "pages kept for a day, a promise or a person",
    "slug": "sealed",
    "score": 7.4,
    "scores": {
      "wow": 9,
      "fit": 7,
      "retention": 6.7,
      "growth": 7,
      "feasibility": 6.7,
      "safety": 7
    },
    "pitch": "Press the vermilion seal on a page, a bundle of memories, or a letter to someone you love, and Kata keeps it shut until a date, until a to-do is done, or until a birthday. Then it delivers it with that Sunday's letter.",
    "wow": "Your promise 'Get the offer' is finally kept, and that Sunday the letter opens with a page you sealed 14 months earlier, on the worst day of your job search: 'If you're reading this, you got it.' Or on her 30th birthday a friend opens 41 memories that eight people quietly kept for her all year.",
    "how": "From any page, choose 'Seal this' and pick when it opens: a date (one year, '18th birthday'), a condition (when the promise 'Get the offer' is kept), or an event. Once sealed, it shows only as an envelope with a countdown on your almanac, and you cannot reread it. There are three social forms. A group capsule ('Our 2027', a graduation QR code) lets 2 to 12 people each add pages they can't see each other's, and it opens for everyone on the same morning. Kept For You lets you mark passages all year as 'kept for Maya'. Co-keepers add memories to the same capsule without seeing each other's, and on her birthday she opens a hand-bound book of every memory, each signed with its keeper's hanko. A sealed promise is a commitment to a person ('I'll call Dad every Sunday this autumn'). When it opens, Kata adds a 'What happened' note drawn from your pages, which you approve before it goes. On opening day the letter starts with the capsule, and Kata adds a then-and-now margin note comparing what you feared with what your later pages show happened. You can reply to your past self with a page that threads across the years.",
    "social": "Shared anticipation instead of engagement. Others can see that a friend has added to the capsule (a seal appears) but not what they wrote. A capsule addressed to someone who isn't on Kata arrives as a beautiful email and becomes the most emotional referral path in the product. Nobody likes or comments. You can only answer with a page of your own.",
    "privacy": "Private to the author until opening, then visible only to the named recipients. Co-keepers never see each other's contributions early. Content is encrypted at rest and read by the LLM only at opening. The author can postpone, edit before sealing, or cancel, with a review prompt the night before it opens. Recipients can decline future capsules from a sender.",
    "risks": "This is a promise that has to last years. It needs export, an escrowed or emailed encrypted bundle, and an 'open everything now' plan if Kata shuts down. Conditional unlocks need a fallback date. Openings can be painful after a death, a falling-out or a breakup, so add a private-open option and sender recall. Email addresses go stale, so allow backup contacts. Media storage costs make this a natural paid tier.",
    "lenses": [
      "memories",
      "privacy",
      "contrarian",
      "business",
      "growth",
      "irl",
      "intentions"
    ]
  },
  {
    "id": "promises",
    "rank": 4,
    "title": "Promises",
    "subtitle": "to-dos that get sealed, witnessed or released",
    "slug": "promises",
    "score": 7.3,
    "scores": {
      "wow": 6,
      "fit": 8,
      "retention": 8.3,
      "growth": 6,
      "feasibility": 8.7,
      "safety": 7.7
    },
    "pitch": "Kata's to-do list. Each item is a promise written on the daily page: it fades a little each day you carry it, it closes with a hanko stamp, and one to three friends can witness it and co-sign it when you keep it.",
    "wow": "Your Sunday letter says: 'You kept 11 of the 14 promises you shared and 4 of the 9 you kept to yourself. The ones you say out loud, you do.' Or you finally send the job application you'd been avoiding, and that night it sits in your history with your seal and two friends' seals beside it, like a signed document.",
    "how": "The daily page gets a Promises block, capped at 5 open items and quick to capture from voice or the share sheet. Unfinished promises carry to tomorrow, written a little paler each time so you can see how long they've been with you. On the third carry Kata asks you to choose. Keep it, with a smaller first step Kata suggests. Release it, with one line of why and a dignified release stamp. Or Ask: turn it into a request to specific people ('Can someone review my portfolio this week?'), and when someone helps, both pages get a double seal with each other's name. Finishing a promise is a press-and-hold that stamps the vermilion seal with a soft haptic thud. For a promise that matters you can add a witness, who can be a non-user reached by email. Witnesses see only the text, the due day and the outcome. They get one card when you make it and one when it resolves, with no nagging in between, and when it is kept they press their own seal beside yours. Repeating promises ('300 words before work, 40 days') become a vow scroll that fills from a linked yes/no or number field. Promises with people ('cook Nani's biryani') become a memory card when kept. The Sunday letter reflects on the pattern.",
    "social": "Witnessing replaces following: a small, specific role you give to one to three people. Co-signing a kept promise is the only reaction. Asking for help is a social act addressed to named people, never broadcast. A non-user witness who seals by email is then invited to make a promise of their own and name you, which gives a two-person, high-intent loop.",
    "privacy": "Promises are private by default and witnesses are optional. A witness never sees your pages, mood, progress ticks or lapsed promises. 'Released' shows them nothing more unless you add detail, and you can send them nothing at all. Removing a witness sends no notice. Asks share only the text you rewrite before sending.",
    "risks": "It could become a guilt machine, which is the loud kind of habit the brand rejects. So release is never counted as failure, there is no red, and witnesses send no reminders. Unequal witnesses such as a manager or a controlling partner should be discouraged in the copy, with easy removal. Requests per witness and email invites need caps to stop spam. Resist growing into Todoist: the value is the seal and the witness, not features.",
    "lenses": [
      "graph",
      "privacy",
      "ai",
      "accountability",
      "intentions",
      "contrarian",
      "growth",
      "mobile",
      "irl",
      "business"
    ]
  },
  {
    "id": "kasane",
    "rank": 5,
    "title": "Kasane",
    "subtitle": "write your side",
    "slug": "kasane",
    "score": 7.22,
    "scores": {
      "wow": 9,
      "fit": 7.7,
      "retention": 5.7,
      "growth": 8,
      "feasibility": 5,
      "safety": 6
    },
    "pitch": "Memories become shared objects. When you write about a day with someone, they're invited to write their own version without seeing yours, and both versions unseal at the same moment, layered like translucent paper.",
    "wow": "You read your best friend's version of the night you thought had gone badly, written blind, and learn it was her favourite day of the month. Or the trip split view: Dad wrote about the missed train, the daughter about the vending machine with hot corn soup, and the son that it was the best day of the trip.",
    "how": "There are three ways a Kasane begins. First, highlight a passage on a private page ('the night the power went out at the hostel in Hampi') and choose 'Pass to someone who was there'. Second, if two connected people @mention each other on the same date, Kata notices and adds an invitation to both Sunday letters: 'You and Priya both wrote about Saturday. Keep it together?' Third, for events and trips, create a Same Day (a wedding, a hackathon) or a Tabi trip volume and share it by QR code. Each attendee's form temporarily gains event prompts (best moment, something nobody else saw, one photo). Every contributor's version stays sealed until all have written or the 72-hour unfold time passes. Then they open together as layers you can fan out: two columns for a pair, 'four pens, one day' for a trip. Kata adds a short preface on where memories overlapped and differed, and it never says who was right. There is also a Year-Late Exchange: each Sunday Kata may offer to swap a page that you and a friend both wrote exactly a year ago, with redaction first. Over time each friendship builds a private 'Book of Us', and Kata resurfaces each Kasane on its anniversary.",
    "social": "Connection through a real shared memory rather than a follow button. Blind co-authorship and a simultaneous reveal create anticipation. Your People page lists friends by the Kasane you share and how they spread across the years, never by follower counts. Inviting someone with 'Leela remembers something you were part of' is a far stronger hook than 'join my network'.",
    "privacy": "Your page stays private. Only the exact passage you pass, or the event page, is shared, and only with the named people after they accept. Matching on mentions requires an accepted connection first and never tells someone that you wrote about them. Any field can be marked 'keep for myself' before unfolding. Each person can withdraw their layer, and nothing can be passed on without every author's agreement.",
    "risks": "Painful differences between versions or unwanted tagging (an ex) call for decline-silently, a 'don't pass to me' setting and blocking. Third parties named in memories never consented. Photo uploads bring storage and moderation costs. One person who never writes is handled by the deadline. The LLM preface must not leak 'keep for myself' fields or invent intimacy. The Year-Late Exchange needs a year of history, so it offers a six-month mode early on.",
    "lenses": [
      "graph",
      "together",
      "ai",
      "business",
      "contrarian",
      "irl",
      "craft"
    ]
  },
  {
    "id": "two-pens",
    "rank": 6,
    "title": "Two Pens",
    "subtitle": "a volume for two",
    "slug": null,
    "score": 7.02,
    "scores": {
      "wow": 8,
      "fit": 7,
      "retention": 8,
      "growth": 5,
      "feasibility": 8.3,
      "safety": 4.3
    },
    "pitch": "A shared volume for two people, such as partners, siblings, co-founders or a parent and an adult child. Each person writes their own page, the other's page opens only after yours is sealed, and on Sunday Kata writes one letter to both of you.",
    "wow": "The first Sunday letter addressed to both of you picks up something neither of you said: 'Mira wrote three times this week that she misses your Saturday walks.' Or you come back after a bad Thursday and see 'Ana lent you her ink for Thursday', with her seal pressed over the gap.",
    "how": "One person opens 'Begin a volume for two' and sends the link. Together you agree a pact: in two columns of your form fields, each of you toggles 'just me' or 'for us' (for example mood, energy and a long-text 'What I want you to know'). Each evening your partner's 'for us' fields show as a sealed envelope with their hanko, and it opens only once you have sealed your own page. You can't read without writing. Days when both of you wrote get a double seal of two overlapping 型 stamps in a shared almanac. You can leave one margin note on your partner's open page each day. If your partner misses a day, you can 'lend ink': you spend one of your own streak freezes to protect theirs, at most twice a month. On Sunday a section titled 'To the two of you' overlays both mood and energy lines on a two-ink chart (sumi and vermilion). It names rhymes and gaps as observations and questions, and it ends with one suggested shared intention that either person can accept onto both pages.",
    "social": "The most intimate social unit, one to one. The only rule is to write before you read. The double-seal streak belongs to the pair. Lending ink costs the giver something, which gives it meaning. There are no likes, read receipts or 'last seen'.",
    "privacy": "Nothing is shared by default. Only fields each person marks 'for us' are visible, field by field, and the joint letter reads only those. A field can be made private again with no notice sent. Either person can leave quietly, and the volume then shows only 'this volume is resting'. Leaving either freezes the shared history read-only or deletes your half, your choice. Nothing is ever public.",
    "risks": "Controlling relationships are the main danger, because a partner could pressure someone to share or use the volume as surveillance. Mitigations: no read receipts, silent un-sharing and pausing, and links to abuse resources. Breakups need a graceful archive or delete flow. The LLM must stay observational and never assign blame or score the relationship. Cost is one extra call per pair per week.",
    "lenses": [
      "together",
      "accountability",
      "ai"
    ]
  },
  {
    "id": "leaves-and-shelf",
    "rank": 7,
    "title": "Leaves & the Shelf",
    "subtitle": "a public book, followed slowly",
    "slug": "shelf",
    "score": 6.55,
    "scores": {
      "wow": 6,
      "fit": 8,
      "retention": 6.3,
      "growth": 7.7,
      "feasibility": 5.7,
      "safety": 4.7
    },
    "pitch": "Publish single pages as 'leaves' under a pen name on a quiet public colophon. Following someone means placing their book on your shelf, which holds only 30, and their new leaves arrive bundled into your Sunday Edition. There is never a timeline.",
    "wow": "Kata's Sunday letter ends with 'P.S. I think you'd like Mira', and the two quoted lines say something you wrote yourself that week. Or a Job Seeker sends a recruiter their colophon of 90 published leaves instead of a cover letter.",
    "how": "Anyone can claim kata.app/@name as a colophon: a short note, the form they use (clonable from the gallery), their year of ink as presence-only squares, 'open works' (promises they've chosen to make public, such as 'novel draft: 3 of 12 chapters sealed'), and a shelf of what they've published. Any page can become a leaf. You choose fields (the long reflection, but not mood), Kata suggests cleaning out names and places, and you can set a 24-hour cooling delay. Tag-based leaves can be bound into a Volume, a serial book like 'Building Lantern, Vol. I', with a monthly chapter that Kata gives a title page. To follow, you place someone on your Shelf. It has 30 spines, so adding a 31st means taking one down. Each spine opens into that person's leaves in their order. Every Sunday your letter ends with 'The Sunday Edition': at most 5 leaves from your shelf, with a short editor's note from Kata ('Two of the founders you keep wrote about pricing'). Kata also occasionally adds a P.S. introducing someone whose leaves rhyme with yours, matched on published leaves only. The only response is a marginal note to the author. Writing one presses that author's seal into your Goshuin, a seal book that maps the minds you have actually read. Gallery forms now show 'written in publicly by 34 people', and 'Walk with this' clones the form and lines your day 1 up beside theirs.",
    "social": "Asymmetric following, made scarce (30 spines) and slow (once a week, inside the letter). Follower counts are hidden from everyone, including the owner, who sees only 'kept on some shelves'. Discovery comes through forms, roles and Kata's one-a-week introductions, never trending or an explore grid. The seal book rewards depth, meaning how many people you've truly read, not reach.",
    "privacy": "No colophon exists by default, and every page is private until published on its own. Mood, energy and numbers are excluded unless chosen field by field. The almanac shows presence by date only, never times. Being introduced is a separate opt-in, and private entries are never embedded or matched. Leaves can be unpublished at any time, though not from letters already sent, and the publish sheet says so. Marginal notes can be limited to people you follow back.",
    "risks": "This is the concept closest to becoming Medium. If the 30-spine cap, the weekly-only delivery and the no-counts rule ever bend, the soul is gone. Oversharing in the moment is handled with the cooling delay and cleanup. Re-identification through specifics. Marginal notes as a harassment channel need a toxicity screen, rate limits and blocking. Moderation of public content and self-harm intercepts. Cold start: seed it with gallery authors and invited writers in each role.",
    "lenses": [
      "business",
      "growth",
      "graph",
      "serendipity",
      "formats",
      "intentions",
      "craft"
    ]
  },
  {
    "id": "pressed-flowers",
    "rank": 8,
    "title": "Pressed Flowers",
    "subtitle": "the archive that remembers back",
    "slug": "pressed-flowers",
    "score": 6.55,
    "scores": {
      "wow": 8,
      "fit": 5.3,
      "retention": 8.7,
      "growth": 3,
      "feasibility": 6.3,
      "safety": 6.7
    },
    "pitch": "Your past comes back to you. Each morning a page from years ago is pressed into the corner of today. Milestones return every year with the question you answered then. Places hand back what you wrote there. And you can ask your journal anything, then lend chosen pages to the people you love so they can ask too.",
    "wow": "On the one-year mark of 'Moved to Berlin' you answer 'What do you miss?', then last year's answer unseals: the same three words, except one is gone. That evening your sister, your witness, writes 'You stopped saying home means Hyderabad. I noticed.' Or a daughter asks her mother's lent pages 'What were you scared of the year I was born?'",
    "how": "On This Day: a small pressed-flower card on today's page shows the same date in earlier years (a line, a photo, your mood stamp) with three options: Keep, Answer (adds a reply line to today) or Let it rest. Early on it offers 'a month ago' so it has value from the start. Tree Rings: when Kata notices a page that changed you ('Started at Acme', 'Moved to Berlin', a big promise kept), it proposes it as a milestone, and the milestone appears as a mark on a private ring diagram. On each anniversary, today's page asks the exact question you answered back then and reveals your old answer only after you've written the new one. You can invite up to 3 witnesses to a milestone, and they receive the then-and-now pair (which you preview) and can write you one note. Places: pages can carry a coarse place, an ink atlas darkens with visits, and returning to a place surfaces 'You were here in March 2025. You wrote…'. You can leave a stone at a place for one named friend, readable only when they're physically there. Ask my almanac: semantic search across all your pages and letters, answered as a short letter with tappable seal citations, and it refuses when there is no evidence. Lending: mark months or tags as lendable to a specific person ('What was Dad doing at my age?'). Kata drafts an answer from those pages only, and you approve, edit or decline before it is sent as a keepsake card.",
    "social": "Witnessing a chapter of someone's life replaces following them. You choose who sees which moment, and only on anniversaries. Lending turns a journal into an heirloom people can talk to, with the owner approving every answer. Stones left for friends make discovery physical and slow.",
    "privacy": "Everything resurfaced is shown only to its author. Milestones and lending are private by default, set per person and per page range, and revocable. Every lent answer needs your approval before anyone sees it, and askers never see raw pages unless you attach them. Places are stored at city level by default and never as live tracking, with home zones excluded. Embeddings are per user, never used to match other people, and deleted with the account.",
    "risks": "Painful dates such as breakups, bereavement and trauma need 'quiet dates', 'never show this period', sentiment-aware skipping and 'mark as tender'. Hallucinated memories are dangerous, so every answer cites real pages or declines. Auto-detected milestones are always proposed, never created. Location is the most dangerous data, hence coarse defaults, delay and no visible history. Geofencing is weak on the web, so the first version checks on app open. Embedding storage grows with history.",
    "lenses": [
      "memories",
      "mobile",
      "ai"
    ]
  },
  {
    "id": "common-book",
    "rank": 9,
    "title": "The Common Book",
    "subtitle": "one question for everyone, every day",
    "slug": null,
    "score": 6.35,
    "scores": {
      "wow": 7,
      "fit": 6.7,
      "retention": 7,
      "growth": 6,
      "feasibility": 5,
      "safety": 4.7
    },
    "pitch": "Every morning the whole community gets the same quiet question on their page. You answer it first, then you may read the well of everyone's anonymous answers, and the next morning Kata prints a broadsheet of 30 of them.",
    "wow": "You answer 'What are you pretending not to want?' honestly for the first time, open the well, and find 400 strangers being just as honest. Then on Sunday Kata's letter puts a stranger's kept line beside your own week: 'A founder in Lisbon offered this the same night: \"I keep shipping so I don't have to stop and look.\"'",
    "how": "At local midnight a Kōan field appears at the top of your daily page, for example 'What did you almost say today?', 'What are you pretending not to want?' or 'Name one thing you'll do before Friday.' You answer privately as part of your Entry. A checkbox lets you 'offer this line', and it is off by default. Only after you answer does the well open: answers shuffled ten at a time, with no ranking and no likes. Next morning at 6am Kata publishes 'The Common Book, No. 412', 30 lines chosen for quality, variety of role and region, and safety (an LLM pass plus a human editor at launch). They are set like a printed broadsheet under pen names, roles and countries. The only action is 'keep': copy a line into your own page as a quotation and write one line under it about why. Authors learn privately in their Sunday letter that 'your line was kept by 14 people', with the reasons quoted. Some kōans are to-do shaped, and on Friday Kata asks 'On Tuesday you said you'd call your sister. Did you?' Mondays carry a kigo, a seasonal word to notice on a ten-minute walk, and offered lines feed a Sunday season page for each city.",
    "social": "A daily commons without a feed. Everyone answers the same question on the same day, and 'answer before you read' prevents lurking and keeps it reciprocal. Keeping costs effort because you have to write why, so it measures resonance, not applause. Counts go only to the author, in private.",
    "privacy": "Your answer is private by default. Offering is a per-answer opt-in, published under a pen name with the country only, or fully anonymous and not linkable across days. Offered lines can be withdrawn until 5am, and once published they can be removed, though copies people already kept remain, marked 'withdrawn'. Wells close after 48 hours.",
    "risks": "Questions can draw out heavy disclosures, so prompts are curated by humans, with moderation and crisis routing. Writing a good question every day is editorial work. The broadsheet needs about 200 offered lines a day, so start at 3 days a week. Pen name plus role plus city can identify people, so the default is country only. Kigo themes must be adjusted for each hemisphere and culture.",
    "lenses": [
      "serendipity",
      "community",
      "irl"
    ]
  },
  {
    "id": "seasons",
    "rank": 10,
    "title": "Seasons",
    "subtitle": "walk a stretch of the year with strangers",
    "slug": null,
    "score": 6.32,
    "scores": {
      "wow": 7,
      "fit": 6.7,
      "retention": 6.3,
      "growth": 7.3,
      "feasibility": 3.7,
      "safety": 5
    },
    "pitch": "Time-boxed cohort practices. Kata runs one every 15-day solar term and a 21-day retreat each solstice and equinox, and gallery authors can host their own. Thousands write privately, are seated at quiet tables of 12, and finish with an anthology and a seal.",
    "wow": "Day 21: an anthology letter made of anonymous lines from twelve strangers in six countries, all answering 'What did you let go of?', and your line is among them, beside a sentence that could have been yours. A year later your almanac holds 24 seals like a passport.",
    "how": "Kata's flagship calendar follows the 24 sekki (for example 'Frost Descends 霜降, Oct 23 to Nov 6: let go of one small thing each day') plus four 21-day Sesshin. Any published gallery form can also become a hosted Season ('Ship Something Daily', '30 days of job hunting'). Joining clones the form and adds a temporary season field and a daily drill to-do. You are seated at a Table of 12 people matched by role and timezone. Your Table sees only pen names, seals and an ink trail of who sat today, never pages. Each day you may offer one line to the Table's 'stone garden', an anonymous wall like raked gravel. At 9pm a single Table notice arrives instead of a feed, and you can leave a nod on someone's line. On the last day, everyone who did at least 10 of 15 days (or 15 of 21) gets that season's seal in their almanac, a stamp passport across the year. Kata publishes the Season Scroll, a long ink landscape of aggregate numbers ('61,380 things let go') woven with offered lines, with yours highlighted in vermilion. You also get a private season letter. Only after this shared experience can you mutually choose to follow tablemates. The year closes with '108 Bells' on Dec 31, where you write releases and seal a letter to yourself that Kata delivers next Dec 31.",
    "social": "Cohort belonging without exposure: shared time, a shared form, anonymous offering and a collective artifact at the end. Following is offered only after a shared experience, so it means something. This solves cold start and discovery. Hosts bring their own audiences, and paid Seasons share revenue (Kata takes 15%). Participant numbers show only as a single phrase ('4,212 are walking this season'), never as a leaderboard.",
    "privacy": "Enrollment is opt-in. Tablemates see only your pen name, seal and whether you sat today. Offerings are per-day, anonymous, previewed and withdrawable until the anthology is set, and Kata strips names and places. Hosts see aggregate counts only. You can walk a Season completely solo with the Table hidden.",
    "risks": "Anonymous walls invite trolling and crisis disclosures, so every offered line is screened, with a resources path. Writing 24 seasons plus 4 retreats a year is a lot, so seasons rotate across years. The Japanese calendar framing needs respect and adjustments for each hemisphere. Missing a day must never feel like failure, so the threshold is 10 of 15. Low-quality or predatory hosts are a risk, so paid hosting needs vetting. Live 108 Bells traffic spikes need batching or polling.",
    "lenses": [
      "community",
      "craft",
      "accountability",
      "business"
    ]
  },
  {
    "id": "chapters-yearbook",
    "rank": 11,
    "title": "Chapters & the Signed Yearbook",
    "subtitle": "",
    "slug": null,
    "score": 6.3,
    "scores": {
      "wow": 8,
      "fit": 5.7,
      "retention": 5.3,
      "growth": 6,
      "feasibility": 5,
      "safety": 7
    },
    "pitch": "Kata turns scattered days into stories. Goals become chapters it writes when they end, a month can be distilled into an essay in your own words, and in December the people close to you sign your yearbook with their seals.",
    "wow": "Unwrapping a hardcover of your year with your mother's and your best friend's seals and notes on the endpapers and Kata's afterword at the back. Or finishing your half marathon to a chapter titled 'Fourteen weeks, from 2 km to 21' that quotes the night you almost quit, and a friend tapping 'Take up this arc'.",
    "how": "Arcs: name a goal ('Run a half marathon', 'Get through the breakup') with up to five milestones as promises. Each day you can tag a sentence, a promise or a number to the arc. The Arc page is a timeline of threaded moments, milestones and a mood ribbon. When you close it, finished or let go (and letting go gets its own gentle letter), Kata writes a 600-word Arc Letter that quotes your pages and names the turning point. You can publish the chapter after approving each quote, and others can 'Take up this arc', which clones its milestones and form but never its content. Distillations: on any monthly letter, 'Distil this month into an essay' offers three angles. Kata drafts using your own phrasing, with each borrowed line linked in the margin to its source page and a visible ratio of how much is your own wording. You can keep it private or submit it, under a pen name if you like, to the seasonal Kata Quarterly. The Signed Yearbook: each December Kata assembles a private draft with the ink almanac as frontispiece, 'lines of the year' (you approve each one), mood rivers, a tag index, monthly letters as chapter openers and a ledger of kept promises. You curate it, then send signing links to chosen people, who don't need accounts. Signers never see the contents. They get a blank endpaper on which they press an auto-generated hanko of their own name and write a note about the year with you. On New Year's Day the yearbook unlocks, and it can be ordered as a cloth-bound book with 型 foil-stamped on the spine.",
    "social": "Finished stories, not live updates. Following an arc author means hearing when they finish a chapter, a few times a year. Signing a yearbook is the one ritual social act of the year: intimate, asynchronous, and open to non-users, so it spreads Kata through the people who matter most. Signers are then invited to 'start your own year'. Quarterly contributors are introduced to each other as a small cohort.",
    "privacy": "Arcs, distillations and yearbooks are private by default. Publishing a chapter or submitting an essay is an explicit opt-in each time, with per-quote approval, and source links are never published. Signers see only their endpaper unless you share a read link, and they can withdraw their note before New Year's. 'Take up this arc' copies only structure. Printing is an explicit order.",
    "risks": "Ghost-writing worries, so the AI must amplify the user's voice and show the ratio. Quotes from private pages leaking into public chapters, so per-quote approval is mandatory. Long-context LLM cost for arcs and yearbooks means summarising first and precomputing through November. Print-on-demand logistics and editorial curation of the Quarterly are real operational work, so launch web-only first. Blank endpapers can feel lonely, so signing stays optional and Kata's afterword stands on its own.",
    "lenses": [
      "intentions",
      "formats"
    ]
  },
  {
    "id": "margins-commonplace",
    "rank": 12,
    "title": "Margins & the Commonplace",
    "subtitle": "capture anything, keep what matters",
    "slug": null,
    "score": 6.18,
    "scores": {
      "wow": 6.3,
      "fit": 6.7,
      "retention": 8,
      "growth": 4.7,
      "feasibility": 3.7,
      "safety": 6
    },
    "pitch": "Kata becomes the place notes go. You send a line, a link, a photo or a voice ramble to today's margin from anywhere, Kata folds it into your page each evening, and the slips you choose become a public commonplace book that people copy by hand.",
    "wow": "Sunday, earbuds in on a walk: Kata reads you your week, and then you hear yourself from Tuesday, tired and laughing about the bug. Or the letter says 'A line you wrote on a bad Tuesday was copied into 31 books. One person wrote beneath it: \"I needed this before my exam.\"'",
    "how": "The share sheet, a home-screen widget and a large hanko-shaped record button all send things to 'today's margin'. Each capture becomes a small timestamped slip down the edge of the page: a typed thought, an article, a Kindle quote, a song link, a screenshot. Talk for up to 5 minutes on a walk and Kata transcribes it (Whisper on Groq) and maps it into your form: mood, energy, 'what I shipped', tags, and any promises it heard ('I need to email Priya'). You review before sealing. One Frame is a single-shot camera with no retakes and one caption line, rendered in sumi duotone, so the year almanac slowly becomes 365 tiny thumbnails. In the evening a 30-second Fold shows the day's slips with suggestions (this quote goes under 'What inspired me', this one becomes a promise). Any slip or line can get a vermilion corner fold that places it in your Commonplace, a quiet public index of lines grouped by theme and season, with no counts. Others can copy a line into their own book only by writing one line about why. Authors hear in their Sunday letter which lines were copied and the reasons people gave. Following a pen name brings their new folded lines into your Sunday letter. On Sunday you can also listen to your letter read aloud, with 3 to 5 clips of your own voice from the week cut in.",
    "social": "You follow people's commonplace books, not their lives, and updates come weekly inside the letter. Copying is the only gesture, and it costs effort because you have to say why, so it measures resonance rather than applause. If two pen names keep copying each other, Kata can offer to introduce them by letter, if both opt in. Once a week you can send one 30-second voice postcard to one person, delivered on Sunday.",
    "privacy": "Every margin, photo and voice note is private by default. Only slips you deliberately fold are public, each showing a 'public' seal before you confirm, under a pen name or anonymously, and never linked back to the source entry. Audio is encrypted, and you can keep only the transcript or turn audio storage off. Photo EXIF data and location are stripped. Withdrawn lines leave copies marked 'withdrawn by author'.",
    "risks": "Copyrighted text and lyrics need quote-length caps, source links and an 'only your words' rule for the public index. Transcription, TTS and media storage costs make audio letters and the photo year a paid tier. Photos bring moderation obligations. Native widgets and the share sheet need a Capacitor or PWA wrapper with an offline queue. Speech can land in the wrong field, so review stays mandatory. The public index needs a few thousand lines to feel alive.",
    "lenses": [
      "mobile",
      "formats"
    ]
  },
  {
    "id": "lamps",
    "rank": 13,
    "title": "Lamps",
    "subtitle": "presence without performance",
    "slug": null,
    "score": 6.12,
    "scores": {
      "wow": 6.3,
      "fit": 5.7,
      "retention": 7.7,
      "growth": 4.7,
      "feasibility": 7,
      "safety": 4.7
    },
    "pitch": "Follow people's lamps, not their posts. All you ever see is whether a friend wrote today. When someone goes quiet, the people who keep their lamp can leave folded notes waiting on their next blank page.",
    "wow": "You come back after a rough week and find three folded notes waiting on today's empty page, one from a friend you didn't know used Kata. Or at 11:40pm you see your street of 23 glowing lamps with yours the only dark one, and write just to light it.",
    "how": "Your lamp lights for the day the moment you seal a page and goes out at your local midnight. The Lamps screen is a quiet night street of up to 30 paper lanterns, lit or dark, with first names under them. You never see words, mood, word counts or streak numbers. Tapping a lit lamp leaves 'warm hands' once a day. It arrives as a faint glow on that person's almanac square, with no name and nothing counted. Up to 7 people can be your keepers. If you've been quiet for 2 days (or a threshold you set), each keeper sees 'Mira has been quiet. Leave a folded note?' and may write 140 characters, once per absence. Nothing is pushed to you. When you next open Kata, the notes sit folded in the margin of your blank page, and you unfold each one by tapping it. Kata's own reminder is a single Kind Bell a day, a question taken from yesterday's page ('How did the 2pm review land?') that you can answer inline from the lock screen. After 10 days away it sends one letter: 'The door is open.' Lamps also gather people in time. A Sitting is a scheduled 25-minute silent writing session where members appear as ink dots that pulse while they type, and afterwards each drops one line into the shared bowl. Kata Tables are the same thing held in person at a café.",
    "social": "Care triggered by absence instead of attention triggered by activity. Following is reduced to witnessing that someone showed up. Warm hands are unattributed and can't be counted, so there's nothing to perform. Sittings give co-presence with no chat, and the only shared content is one line in the bowl.",
    "privacy": "Off by default, and lamps are visible to mutual followers only. The only signal shared is a written or not-written flag per day. 'Draw the curtain' hides your lamp for a while without anything appearing broken, and quiet alerts can be snoozed without anyone being told. Keepers can be removed silently. Bell text can switch to a generic lock-screen mode. An opt-in 'lantern' safety net tells two chosen people after 7 silent days, and it is clearly not a crisis service.",
    "risks": "Daily presence data can reveal routines, and an abusive partner could monitor someone. Hence mutual-only, curtain mode, silent removal and no timestamps. Revealing absence is sensitive (illness, grief), so it is opt-in and can be paused without notice. Lock-screen bells can expose details. Streak pressure could become social pressure, so copy is forgiving. Live presence on serverless uses a 20-second polling heartbeat. In-person tables need public venues and coarse location only.",
    "lenses": [
      "contrarian",
      "accountability",
      "mobile",
      "irl"
    ]
  },
  {
    "id": "red-thread",
    "rank": 14,
    "title": "Red Thread",
    "subtitle": "a kindred stranger, introduced by letter",
    "slug": null,
    "score": 5.8,
    "scores": {
      "wow": 8.3,
      "fit": 7,
      "retention": 5.7,
      "growth": 3.7,
      "feasibility": 3.3,
      "safety": 3
    },
    "pitch": "Once you've written 30 pages, Kata can introduce you by letter to one stranger whose life rhymes with yours, under pen names, for a 30-day season of slow letters and a shared intention list. At the end, both of you secretly choose whether to tie the thread.",
    "wow": "Kata's note to both of you: 'You both wrote about your fathers on Wednesday, in two different languages, three hours apart.' Six months later, she quotes a line from your own letter back to you.",
    "how": "You opt in and say what kind of company would help right now, for example 'someone also in month 3 of a job search' or 'learning to draw late'. Kata drafts a private 'road summary' of themes, stage, role and writing rhythm, never quotes, and you edit and approve it. Each month Kata finds one mutual match and writes both of you an introduction letter that describes the other person only through their approved summary: 'Someone 8 hours away who also writes at 6am, is caring for a parent, and is trying to finish a novel.' If both accept, each gets a pen name and a generated seal, and a season begins with three parts. The first is an exchange diary that is turn-locked, so you can't write twice in a row. Letters can quote your own pages and spend one to three days 'in transit from somewhere in GMT+1'. The second is a shared list where each of you adds up to three intentions and seals the other's. The third is a joint Sunday note about your two weeks side by side. On day 30 each of you privately picks 'tie the thread' or 'let it go', and the result is shown only if both tie. After that, real names can be revealed by mutual consent.",
    "social": "Curated one-to-one introductions with scarcity: one active thread at a time, up to three permanent pen pals. Latency and turn-taking make each letter count. Mutual consent at every step, and endings are graceful: after 3 silent weeks Kata closes the season gently with a 'last letter'. This is how you 'find out about others' through character and circumstance, not follower counts.",
    "privacy": "Off by default and available only after 30 pages. Matching uses only the road summary you approved. Pen names hide your identity until both choose to reveal, and location appears only as a timezone band. Letters are visible only to the pair. Either person can end the thread instantly, which removes the other person's access to future content.",
    "risks": "Stranger contact carries grooming, harassment and romance-scam risk. Mitigations: an 18+ gate, a moderation pass before delivery (the delay helps), blocking of links and contact details until reveal, one-tap block and report, and a human review queue. Crisis disclosures need to route to resources. Matching quality decides everything, because a bad match feels insulting. It needs a big enough pool of users with 30+ pages, so launch first inside big role cohorts such as Job Seekers and Students.",
    "lenses": [
      "serendipity",
      "ai",
      "graph",
      "privacy",
      "community"
    ]
  },
  {
    "id": "the-river",
    "rank": 15,
    "title": "The River",
    "subtitle": "lines set adrift, bottles left for strangers",
    "slug": null,
    "score": 5.52,
    "scores": {
      "wow": 7.7,
      "fit": 5.3,
      "retention": 5.3,
      "growth": 4.7,
      "feasibility": 4.7,
      "safety": 3
    },
    "pitch": "Float one anonymous line from today's page and wake to a stranger's line that rhymes with it. You can also leave a bottle, a note for whoever reaches a moment you've already lived through.",
    "wow": "The day after you write that you're terrified about starting a new job, a bottle arrives, written two years earlier by someone who was exactly where you are: 'You will feel like a fraud for six weeks. Then you won't.' Months later, the sender's Sunday letter tells them it reached you.",
    "how": "Floating: after writing, select one sentence and press the paper-boat 'float'. An LLM strips names, places and links, and you confirm the redacted preview before it leaves. At midnight Kata pairs it by embedding similarity with the closest line floated that day. The next morning, at the top of your new page, you see 'Yesterday, someone also wrote:'. You can keep it in your tide pool or let it go, and you can press a seal that tells its author 'someone heard you'. Catching: on Sunday, after your letter, the River shows five lines drifting slowly across paper-toned water, chosen to match your week's themes. You can catch one and send a single reply of 140 characters or less, which arrives the following Sunday and cannot be replied to. Bottles: turn a past page into a note for a stranger with a condition, picked from about 50 human-reviewed moments ('when someone is about to quit their job', 'their first week at a new job', '100th page'). When someone's page matches that moment, which is classified privately on the server, the bottle arrives above their next morning's page. They can send back 'it reached me', and that line appears in the sender's next weekly letter.",
    "social": "Anonymous, one-to-one resonance with no identities, threads, counts or profiles. You discover others through their honesty, not their persona. It is rare by design: one float a day and one catch a week. Bottles turn your saved memories into gifts for strangers across time, which gives people a reason to keep them.",
    "privacy": "Nothing leaves unless you select a specific sentence and confirm the redacted version. Lines carry only 'somewhere in [continent]', are deleted from the river after 7 days unless kept, and can be recalled until caught. Bottle senders never learn who opened them or why, and recipients never learn who sent them. Receiving is opt-in, with sensitive triggers excluded by default.",
    "risks": "Self-harm and crisis lines are the biggest risk. They need a classifier that sends resources, not strangers, and two crisis lines must never be paired. De-identification can fail on unusual details. Trolls need filtering, rate limits and reporting, because anonymity removes accountability. Classifying private entries for bottles can feel creepy, so it is opt-in, explained, and run against canonical moments once per entry. Cold start is handled by seeding from consenting early users, plus clearly labelled public-domain diary lines 'from the archive'.",
    "lenses": [
      "serendipity",
      "privacy",
      "contrarian",
      "memories"
    ]
  },
  {
    "id": "elders-lineage",
    "rank": 16,
    "title": "Elders & Lineage",
    "subtitle": "learning from people further down the road",
    "slug": null,
    "score": 5.02,
    "scores": {
      "wow": 6.7,
      "fit": 5.7,
      "retention": 5.3,
      "growth": 3.7,
      "feasibility": 3,
      "safety": 3
    },
    "pitch": "Writers who have kept a practice for a long time become Elders who answer newer writers by slow letter, delivered on Sunday beside Kata's own. The most devoted take a few apprentices a season, and the result is a visible lineage of who learned from whom.",
    "wow": "'A senior engineer I'd never met wrote me two pages about her own first layoff. It arrived Sunday morning with my Kata letter, sealed with her stamp.' Later you see your lineage tree: the sensei who taught you, the one who taught them, and two people you've since taught yourself, drawn as ink branches with seals at each node.",
    "how": "Practices earn private belts. Any form or recurring promise can be declared a practice and moves from white to black belt through return, depth (pages that refer back to earlier ones, promises actually kept) and a 'kata review' where you reread a month and write what changed. Belts only go up, and silence shows as 'resting'. Each promotion arrives as a grading letter that quotes three of your own lines showing growth. After 100 written days in a role you're invited to become an Elder, with a pen name, a seal and a line on 'what I can speak to'. A stuck writer selects a passage on their own page and chooses 'Ask an Elder'. Kata helps strip identifying details, then routes the question to 3 matching Elders, and the first to accept has 7 days to write back in a letter composer. Elders also write one public 'Field Note' a month, and following an Elder means receiving those notes as letters. Black belts may open up to 3 apprentice seats for a 12-week season. The apprentice marks individual pages 'for sensei'. The sensei leaves margin notes in a different ink on those pages only and assigns a small drill every two weeks, which lands in the apprentice's Promises. A closing letter ends the season, and if both opt in, a lineage line is added ('trained under ___').",
    "social": "Mentorship as the only status system. Prestige comes from the people you helped, shown as a lineage tree, and thanks arrive privately. Following an Elder is following a voice, once a month. Belts are quiet credentials on a profile, with no leaderboards. Seat caps and fixed seasons keep it slow and protect Elders from burnout.",
    "privacy": "Belts and grading letters are private by default, and a profile shows only the practice name and belt colour if you choose. Questions are anonymous: the Elder sees your role and stage only, never your name. Apprentices share page by page with field redaction, and margin notes are visible only to the pair. Lineage is public only if both opt in, and ending a season early removes shared pages from the sensei's view.",
    "risks": "A power imbalance plus intimate writing creates grooming and manipulation risk. Mitigations: 18+ only, no contact details or links early on, an LLM screen on notes, and report and exit always visible. Bad advice on health, legal or money matters needs guidelines. Gamification could push people to write for the meter, so thresholds stay partly hidden and reflection is weighted over volume. Supply comes before demand, so seed with long-streak users and invited professionals, with Kata replying itself as a fallback.",
    "lenses": [
      "community",
      "craft"
    ]
  }
];

export const conceptBySlug = (slug: string) => CONCEPTS.find((c) => c.slug === slug)!;
