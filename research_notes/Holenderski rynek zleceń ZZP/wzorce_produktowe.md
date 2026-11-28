# Product, growth and business-model patterns for a ZZP project marketplace (NL, blue-collar / migrant tradespeople)

Researcher note on method and limits: ~19 tool calls, almost all web searches (search-result summaries, not full-page reads). One direct fetch (a16z.com) failed because the host is outside this session's allowed network domains, so a16z content is cited via search snippets only. Several named companies in the brief returned no usable results; they are listed under Gaps rather than filled from memory. Where I add background from my own knowledge it is explicitly marked "UNVERIFIED (researcher memory)" and sits in Gaps, not in Cited Findings.

## 1. Marketplace theory applied to local services/labor (liquidity, cold start, constrained launch, leakage, take rates)

### Takeaway
The best-documented playbook is: constrain hard (one geography, one category), grow supply first with only 1-3 levers, and expect leakage to be the structural problem in labor/services because the buyer is buying a specific person. Take rate should be set by "convenience + demand - competition", and Gurley's rule is that a lower rake is usually safer than a higher one.

### Cited Findings
- PROVEN (study of 17 large marketplaces): there are two ways to constrain a marketplace, by geography and by category; if supply and demand must be in the same physical location, the constraint is always geographical — [Lenny's Newsletter, How to kickstart and scale a marketplace](https://www.lennysnewsletter.com/p/how-to-kickstart-and-scale-a-marketplace)
- PROVEN (same study): 80% of the companies focused almost exclusively on supply growth in the early phase; only 3 of 17 found supply took care of itself and demand was the constraint (Rover is the counterexample). Thumbtack-era quote from Casey Winters: "To scale, we always went supply side first" — [Lenny's Newsletter, Part 2](https://www.lennysnewsletter.com/i/159750/step-decide-which-side-of-the-marketplace-to-concentrate-on)
- PROVEN (same study): the median number of levers the biggest marketplaces relied on to kickstart supply was two (average 2.5) — [Lenny's Newsletter, Part 1](https://www.lennysnewsletter.com/p/how-to-kickstart-and-scale-a-marketplace)
- Definition: take rate = share of GMV captured by the marketplace; disintermediation (leakage) "stymies growth and suppresses monetization" — [a16z, 13 metrics for marketplace companies](https://a16z.com/13-metrics-for-marketplace-companies/); [a16z marketplace glossary](https://a16z.com/the-marketplace-glossary/)
- OPINION (a16z Marketplace 100): low-frequency, high-ticket categories are exposed to disintermediation and to competitors "swooping in", especially with high transaction values or take rates — [a16z Marketplace 100 2021 (PDF)](https://info.a16z.com/rs/382-JZB-798/images/marketplace-100-2021.pdf)
- OPINION (a16z): services are hard to capture online because success and quality in services is subjective — [a16z, services marketplaces evolution](https://a16z.com/2018/11/27/services-marketplaces-service-economy-evolution-whats-next/)
- OPINION (Sacra, third-party analysis): disintermediation is most dangerous when the customer is buying a specific person, not a generic task; labor platforms that hold up add post-match value (invoicing, payments, dispute handling, reputation), and trust-based categories push toward thinner take rates — [Sacra, Disintermediation risk in service marketplaces](https://sacra.com/chat/h/829c3e65-8244-4aa1-8334-44c2d0ca8c63/)
- OPINION (Bill Gurley, "A Rake Too Far", 2013, via Lenny summary): platforms are often better off lowering their take rate; overpricing is the most dangerous strategy for a platform — [Lenny's Newsletter, Choosing a take rate](https://www.lennysnewsletter.com/p/take-rates)
- Framework (Lenny, analysis of ~40 marketplaces/platforms): take rate = convenience provided to seller + new demand driven - competition; Twitch (50%) is the high end — [Lenny's Newsletter, Choosing a take rate](https://www.lennysnewsletter.com/p/take-rates); [third-party summary](https://personal-learnings.pages.dev/reading_room/issues/lennys_newsletter/0563_choosing-a-take-rate.html)
- Cross-industry range: marketplace take rates run from under 2% (OpenTable) to 70% (Shutterstock) — [Sharetribe Academy, How to set pricing in your marketplace](https://www.sharetribe.com/academy/how-to-set-pricing-in-your-marketplace/)
- OPINION: a higher take rate typically leads to lower transaction volume — [TechCrunch, 4 strategies for setting marketplace take rates](https://techcrunch.com/2021/11/17/4-strategies-for-setting-marketplace-take-rates/)
- OPINION (Braintrust, an interested party, attributing to Gurley): high fees create misaligned incentives that lead to disintermediation as high-quality talent leaves — [Braintrust, Why fees matter](https://www.usebraintrust.com/blog/why-fees-matter)

### Inferences
- For a Dutch ZZP trades app the geographic + category constraint is non-negotiable: e.g. one trade cluster (stukadoor/tegelzetter/timmerman) in one region (Randstad or a single city), with supply recruited first. The Polish-speaking migrant community is itself a natural "constrained supply segment" reachable through 1-2 levers (Facebook groups, WhatsApp referral, Polish shops/accountants) — this matches the "median two levers" finding.
- Construction subcontracting is the worst case for leakage: high ticket, repeat work with the same person, relationship-based. A commission on GMV will leak; the monetization must attach to something the two parties cannot easily replicate off-platform (payment guarantee, invoicing/admin, compliance documents, reputation).
- Using Lenny's formula: a new platform drives little new demand at first and faces heavy competition (Werkspot, Marktplaats, Facebook groups, intermediaries), so the defensible take rate at launch is low; it can only rise with the "convenience" term (admin, guaranteed payment, translation).

### Gaps
- No direct sourced quotes found for Andrew Chen's "The Cold Start Problem" (atomic network, "come for the tool, stay for the network") or NFX essays; no Dan Hockenmaier take-rate material found (his Lenny podcast covers marketplace growth models, not take-rate benchmarks). UNVERIFIED (researcher memory): "come for the tool, stay for the network" is Chris Dixon's 2015 phrase; Chen's "atomic network" is the smallest self-sustaining network — verify before quoting.
- No sourced table of take rates specifically for services/labor categories (Lenny's benchmark spreadsheet is paywalled).
- a16z.com could not be fetched from this session (host not in the allowed network domains); it must be allowed in the session's network settings to read the essays in full.

## 2. Case studies with numbers, and which pricing models workers preferred

### Takeaway
The clearest hard evidence is negative: pay-per-lead generates sustained worker hostility and regulatory risk (HomeAdvisor's FTC order, up to $7.2M), and Angi's 2025 move away from shared, platform-pushed leads improved pro win rates and satisfaction but cost it more than 10% of revenue. Subscription/membership (Checkatrade) and SaaS-plus-free-marketplace (Booksy) are the documented alternatives; commission-on-success survives mainly where payment runs through the platform (Upwork/Fiverr/Malt).

### Cited Findings
Angi / HomeAdvisor (US)
- PROVEN: FTC order (announced Jan 2023) requires HomeAdvisor to pay up to $7.2M in redress to service providers and bars false claims about leads, including that they concern people ready to hire; the 2022 complaint alleged misleading claims about lead quality and source since at least mid-2014 — [FTC press release](https://ftc.gov/news-events/news/press-releases/2023/01/ftc-order-requires-homeadvisor-pay-72-million-stop-deceptively-marketing-its-leads-home-improvement); [TechCrunch](https://techcrunch.com/2023/01/23/the-ftc-fines-homeadvisor-up-to-7-2m-for-lying-about-lead-quality-and-other-matters). HomeAdvisor did not admit wrongdoing (settlement).
- PROVEN: Angi FY2024 revenue about $1.19B, down 13% YoY; Ads and Leads revenue -14%, Services -21%; service requests -26%, monetized transactions -10%; adjusted EBITDA +23% to $145M — [IAC Q4 2024 release (SEC)](https://sec.gov/Archives/edgar/data/0001800227/000180022725000006/ex_991q42024iac-pressrelea.htm); [Simply Wall St summary](https://simplywall.st/stocks/us/media/nasdaq-angi/angi/news/angi-full-year-2024-earnings-revenues-beat-expectations-eps)
- PROVEN (company statements): "Homeowner Choice" (all leads homeowner-selected, rolled out early 2025) improved satisfaction and pro win rates but cut network lead volume; management attributed nearly all of the Q1 2025 revenue decline to it — [Quartr, Angi Q1 2025 summary](https://quartr.com/events/angi-inc-angi-q1-2025_3e5aoGla); [Q1 2025 call transcript](https://ng.investing.com/news/transcripts/earnings-call-transcript-angi-homeservices-beats-q1-2025-forecasts-stock-surges-93CH-1905107)
- PROVEN: Angi Q4 2025 revenue $240.8M, down 10% from $267.9M — [Angi IR](https://ir.angi.com/node/13006/html). Q3 2025: proprietary leads +16%, revenue per lead +11%, total revenue -10% — [Q3 2025 transcript](https://fintool.com/app/research/companies/ANGI/documents/transcripts/q3-2025)
- Company framing (2025): shed over $500M of lower-quality revenue; proprietary revenue went from -24% (2024) to +17% (2025); adjusted EBITDA near $140M — [Angi investor material](https://ir.angi.com/static-files/af4b2655-6627-482c-9f63-2e8a0fe5d5b0). Network-channel decline is reported inconsistently (about 60% in the transcript vs 79% in a summary) — [AOL transcript](https://www.aol.com/articles/angi-angi-q4-2025-earnings-151043935.html); [Finviz](https://finviz.com/news/312413/angis-q4-earnings-call-our-top-5-analyst-questions). FY2025 revenue about $1.03B (-13%) is from a third-party site only — [Panabee](https://www.panabee.com/news/angi-earnings-2025-annual)

Thumbtack (US)
- Model: pay-per-lead; pros pay to connect and compete; lead price varies with job size, market and pro's max-price settings — [Housecall Pro guide (competitor source)](https://www.housecallpro.com/resources/what-is-thumbtack-how-it-works/); [Handyman Startup](https://handymanstartup.com/thumbtack-pro-reviews)
- ANECDOTAL (forum/review posts, not systematic): pros charged for leads that go nowhere; one pro reports a $112 lead where the customer contacted five pros; complaints trace back to the 2017 "Instant Match" launch; pros say they cannot opt out of instant booking — [Thumbtack community](https://community.thumbtack.com/discussion/comment/3336/); [Thumbtack community, leads payment](https://community.thumbtack.com/discussion/2160/leads-payment); [Trustpilot](https://uk.trustpilot.com/review/thumbtack.com?page=3). Thumbtack's stated position: pros pay only for leads, not after being hired — same Trustpilot thread.

Checkatrade (UK)
- Model: no joining fee, monthly membership; basic tier from £30 + VAT/month (blog, Dec 2024), pricing page lists plans from £59/month; four tiers, "Approved" tier includes vetting badge but no leads — [Checkatrade blog](https://www.checkatrade.com/blog/trade/start-business/does-checkatrade-cost-money/); [Checkatrade pricing](https://join.checkatrade.com/pricing)
- Revenue £55.6M (2022; Wikipedia, not 2024) — [Wikipedia](https://en.wikipedia.com/wiki/Checkatrade)
- Checkatrade runs referral incentives for members (referred-member discount, cash incentive) — [Checkatrade offer terms](https://join.checkatrade.com/?p=235288)

Workrise / RigUp (US, vertical skilled-trades labor marketplace)
- PROVEN: raised $300M at a $2.9B valuation in May 2021 (600+ employees); in April 2022 cut staff and exited verticals including construction and defense — [TechCrunch 2022](https://techcrunch.com/2022/04/05/workrise-cuts-staff-verticals-after-being-valued-at-2-9b-last-year). Valuation is reported as $1.9B by other databases (conflict) — [CB Insights](https://www.cbinsights.com/company/rigup/financials)
- Estimates of 2022 layoffs vary (unspecified per TechCrunch; ~450 per Sacra); in Sept 2025 the company reverted to the RigUp name and refocused on energy (staffing + supplier software + admin services) — [Sacra](https://sacra.com/c/workrise)

Instawork / Wonolo (US, hourly shift marketplaces)
- Instawork: about $150M raised over 8 rounds (Series D $60M, May 2023); claims 6M+ hourly workers — [CB Insights](https://www.cbinsights.com/company/instawork/financials); [Built In](https://builtin.com/company/instawork). Revenue figures conflict ($97.3M 2024 via Getlatka vs $24M flat on Dealroom) — [Accio](https://www.accio.com/business/instawork); [Dealroom](https://dealroom.co/companies/instawork/)
- Wonolo: about $194M raised, last round $138-140M in Oct 2021; charges businesses a fee per placement (client-pays) — [TechCrunch](https://techcrunch.com/2021/10/19/wonolo-raises-140m-for-its-staffing-platform-used-by-1m-laborers-and-front-line-workers); [CB Insights](https://cbinsights.com/company/wonolo)
- REGULATORY RISK: Colorado reportedly forced Instawork to stop contractor shifts and pay $400,000 (Nov 2025); California PAGA misclassification suits filed Oct 2024 and Feb 2025 — [Simplify.jobs](https://simplify.jobs/c/Instawork) (secondary source; verify)

Upwork / Fiverr / Malt (freelance, payment-on-platform)
- Third-party estimates: Fiverr 20% freelancer fee (~25% combined with client fee); Upwork 10% flat freelancer fee since 2023 (previously sliding 20%/10%/5%), ~15% combined, plus paid "Connects" (~$0.15 each) to submit proposals; Malt ~10% freelancer + ~5% client — [Jobbers.io fee report](https://www.jobbers.io/how-much-do-platforms-earn-from-freelancers-the-4-2b-fee-extraction-report-2026/) (editorial estimates; verify against official fee pages)

Booksy (Polish origin, SaaS + marketplace)
- Flat subscription ($29.99/month base in the US, per-user pricing) bundling booking, reminders, marketing tools and marketplace listing; marketplace bookings are free unless made through the optional "Boost" feature — [Booksy vs StyleSeat](https://biz.booksy.com/en-us/comparison/styleseat-comparison); [Koalendar pricing guide](https://koalendar.com/blog/booksy-pricing)
- Contrast: StyleSeat charges up to 30% when its marketplace brings a new client — [Booksy comparison page (interested party)](https://biz.booksy.com/en-us/comparison/styleseat-comparison)
- Described in Polish business press as "marketplace and SaaS in one solution" — [XYZ.pl](https://xyz.pl/?p=83113)
- Competitor benchmark: Fresha ARR $43.4M in 2024 — [BeautyMatter](https://beautymatter.com/articles/unwrapping-the-money-behind-beautys-booking-platforms)

Poland: Fixly, Oferteo
- Oferteo: free for clients, contractors bear all fees by buying points that unlock contact details; refund option worth 15% of purchased points; 190,000+ firms in home-and-garden alone — [Oferteo cennik](https://www.oferteo.pl/cennik); [Oferteo FAQ](https://www.oferteo.pl/faq.html); [Oferteo llms.txt](https://www.oferteo.pl/llms.txt)
- Fixly (OLX Group): contractors need points to respond to requests; an older comparison says Fixly offered unlimited responses for roughly the price of Oferteo's 200-point pack (dated, single source) — [Komputronik](https://nano.komputronik.pl/n/aplikacja-fixly-opinie-cena/); [OLX Group](https://www.olxgroup.com/brands/fixly/)
- OLX ended free listings in its Services category — [Antyweb](https://antyweb.pl/koniec-z-darmowymi-ogloszeniami-na-olx-w-kategorii-uslugi)

### Inferences
- Angi is the best natural experiment available: giving the customer the choice (fewer, better-matched leads) raised revenue per lead and pro win rate but shrank volume. A newcomer has no legacy lead revenue to lose, so it can start where Angi was forced to end up: customer-selected or exclusive matches, never the same lead sold to 5 pros.
- Polish tradespeople arriving in NL already know the points/pay-per-contact model (Oferteo, Fixly) and its frustrations; "0 punktów, 0 opłat za kontakt" is a concrete positioning message.
- Booksy shows the pattern most relevant to the brief: charge a flat fee for a tool the worker uses daily, make marketplace demand a free bonus, and charge extra only for clearly incremental new customers.
- Workrise is a caution against expanding verticals before unit economics work: it exited construction within a year of a $2.9B valuation and survived by retreating to its original niche plus software and admin services.
- Instawork's regulatory trouble maps directly onto Dutch schijnzelfstandigheid enforcement: a platform that sets rates, assigns shifts and controls the work looks like an employer or uitzendbureau. Design the product as a tool for independent contractors (worker sets price, can negotiate, can substitute) rather than a shift-dispatch system.

### Gaps
- No usable results for: TaskRabbit, MyHammer/Instapro/Werkspot pricing changes, Trusted Health, Jobber/ServiceTitan numbers, Pracuj/OLX Praca, Useme, Treatwell commission, Malt official figures, Temper, Freelance.nl. These need a dedicated pass (and several are probably covered by the researcher handling Dutch competitors).
- No systematic survey evidence on which pricing model workers prefer; the evidence is behavioural (Angi), regulatory (FTC) and anecdotal (forums). UNVERIFIED (researcher memory): Werkspot/MyHammer moved toward subscription-style models and Treatwell charges a commission on new-client bookings plus a monthly fee — verify.
- No 2024 Thumbtack revenue found (private company).

## 3. Vertical B2B construction subcontracting / labor marketplaces

### Takeaway
Evidence of a breakout vertical construction-labor marketplace is thin: the largest attempt (Workrise) retreated from construction, while the European example found (Crafthunt) is a recruiting/career platform for employed workers rather than a subcontracting marketplace for self-employed crews.

### Cited Findings
- Crafthunt (Munich): €3M seed in June 2024 (UVC Partners, Redstone, angels); describes itself as Europe's largest construction career platform; AI-powered matching of job postings to domestic and international talent pools — [UVC Partners](https://uvcpartners.com/blog/crafthunt-europes-largest-construction-career-platform-secures-eu3-million-to-combat-skilled-labor-shortage); [Munich Startup](https://www.munich-startup.de/en/news/crafthunt-secures-e3-million-in-seed-round)
- Crafthunt scale (one profile): 30,000 construction specialists and 700 employers — [Welcome to the Jungle profile](https://app.welcometothejungle.com/companies/Crafthunt). Earlier $1.5M pre-seed in March 2023 led by HW Capital — [Nordic9](https://nordic9.com/news/crafthunt-was-pre-seeded/)
- Skillit (US): launched Jan 2023 with $5.1M seed to address the skilled-labor shortage in construction — [BusinessWire](https://www.businesswire.com/news/home/20230120005410/en/Skillit-Launches-with-5.1M-Seed-Capital-to-Solve-Skilled-Labor-Crisis-in-Construction)
- Workrise exited the construction vertical in April 2022 — [TechCrunch](https://techcrunch.com/2022/04/05/workrise-cuts-staff-verticals-after-being-valued-at-2-9b-last-year)

### Inferences
- Funding sizes in this niche are small (single-digit millions) compared with horizontal shift marketplaces, which suggests investors see it as hard; that is consistent with the leakage theory in section 1 (repeat, relationship-based, high-ticket work).
- The white space for the Netherlands is specifically self-employed crews plus main contractors plus cross-language matching, which none of the found examples targets; but there is no proof yet that anyone has made it work at scale.

### Gaps
- No results obtained for Buildforce, Trade Hounds, Core, Laborup, Builderhead or YoungCapital-type models; their outcomes (several are believed to have pivoted or shut down) could not be verified in this session.
- Whether Crafthunt uses WhatsApp-based onboarding was not confirmed by the sources found.

## 4. AI features feasible and differentiating in 2025-2026

### Takeaway
The strongest sourced signal is that AI collapses the cost of vetting, matching and conversational intake, which is exactly what made low-frequency, heterogeneous categories (skilled labor, repairs) uneconomic for marketplaces before; WhatsApp plus voice AI in the worker's own language is already running at scale in Indian frontline hiring. AI quoting for tradespeople exists but is mostly text-drafting; photo-based estimating is still contested.

### Cited Findings
- OPINION (a16z, Olivia Moore, Nov 2025): AI can vet supply and demand, make the match and manage the relationship in categories like skilled labor, real estate and repairs where transactions are infrequent or heterogeneous; with AI interviewers, cost per match can fall from hundreds of dollars of human labor to a few dollars; AI does not fix marketplaces whose real constraint is scarcity, subjective quality or trust. Example cited: a 1.5% seller commission versus a 6% industry standard — [a16z, Marketplaces in the age of AI, take two](https://a16z.com/marketplaces-in-the-age-of-ai-take-two-graveyard-to-greenfield/) (read via search snippet only)
- Hunar.AI (India): runs sourcing, screening, documentation, interview scheduling and onboarding for frontline workers over WhatsApp, with voice AI answering candidate questions; voice stack reportedly handles 30,000+ calls/day, tuned for noisy environments and language switching — [YourStory](https://yourstory.com/ai-story/hunarai-whatsapp-ai-fix-india-frontline-hiring-problem); [Wati case study](https://www.wati.io/case-studies/hunar-ai/)
- COMPANY-REPORTED: Hunar.AI claims 75% shorter recruitment time (up to 90% for some workflows) — [GoodReturns](https://www.goodreturns.in/news/hunar-ai-s-voice-ai-speeds-up-frontline-hiring-cuts-recruitment-time-by-75-011-1499315.html)
- WhatsApp-based hiring for operational/blue-collar roles is also being productised in Mexico and in mainstream ATS tools (Workable, Recruitee) — [Mexico Business News](https://mexicobusiness.news/talent/news/whatsapp-work-streamlining-hiring-operational-roles); [Workable](https://resources.workable.com/backstage-at-workable/message-candidates-on-whatsapp-right-from-workable/); [Recruitee](https://recruitee.com/whatsapp-hiring-old)
- Crafthunt uses AI matching between job postings and domestic/international construction talent — [Springwise](https://springwise.com/diversity-social/innovation-property-construction-ai-based-matching-tackles-construction-skills-gaps)
- AI quoting: Housecall Pro markets AI-drafted estimates "in seconds"; Jobber lets contractors use Jobber AI to draft quote content on its Grow plan — [Housecall Pro](https://www.housecallpro.com/?p=414); [QuoteIQ comparison](https://myquoteiq.com/best-ai-estimating-software-plumbing-2026/)
- DISPUTED: QuoteIQ (a competitor) claims neither Jobber nor Housecall Pro offers photo-based AI estimating as of April 2026; no independent confirmation found — [QuoteIQ](https://myquoteiq.com/ai-estimator/)
- Angi's 2025 strategy includes AI product expansion alongside the lead-quality shift — [Barchart, Angi Q4 deep dive](https://www.barchart.com/story/news/164455/angi-q4-deep-dive-traffic-headwinds-cost-cuts-and-ai-product-expansion)

### Inferences
- The highest-leverage AI features for Polish/Romanian/Ukrainian ZZP'ers are the ones that remove the language and paperwork barrier, not smarter ranking: (a) job posts and chat auto-translated both ways, (b) voice-note onboarding in the native language that produces a Dutch profile, (c) offerte and factuur generated in correct Dutch from a spoken or typed description. These are standard LLM/speech capabilities in 2026 and no Dutch incumbent found in this research offers them.
- Given the a16z cost-per-match argument, an AI intake agent that structures a vague client request (photos, measurements, deadline, budget) before it reaches workers is a way to deliver the "fewer, better leads" outcome that Angi had to restructure its business to reach.
- Photo-based automatic pricing should be treated as an experiment, not a launch promise; the incumbents' own claims are limited to text drafting.

### Gaps
- No sourced examples found for: listing aggregation and de-duplication products, automatic portfolio/CV generation from photos, AI fraud detection in labor marketplaces, or agents that apply/negotiate on a freelancer's behalf. UNVERIFIED (researcher memory): auto-apply agents exist in white-collar job search (e.g. LazyApply, Sonara, AIApply) and have drawn employer backlash; aggregators such as Jooble, Adzuna, Indeed and Jobrapido rely largely on partner feeds; Apna and Vahan in India are large blue-collar hiring apps using chat and voice AI — none of this was verified here.
- No German or LatAm WhatsApp job-bot results beyond the Mexico trade article.
- No independent measurement of LLM translation quality for construction terminology in Polish/Dutch/Romanian/Ukrainian.

## 5. Legal and technical constraints on aggregating listings from other sites (EU)

### Takeaway
Scraping other platforms' listings is legally risky on two independent tracks: the sui generis database right (job-ad databases have been held protectable, and a specialised search engine can infringe if it harms the maker's investment) and contract (site terms can ban scraping even where no database right exists). The safe route is partner feeds/APIs, employer-direct posting, and linking out.

### Cited Findings
- Ryanair v PR Aviation (CJEU C-30/14, Jan 2015; Dutch origin): Dutch courts found Ryanair's flight data had neither copyright nor sui generis protection; the CJEU held that the Database Directive's mandatory user exceptions therefore do not apply, so the site owner is free to prohibit screen-scraping by contract (terms of use) — [Pinsent Masons](https://www.pinsentmasons.com/out-law/news/website-operators-can-prohibit-screen-scraping-of-unprotected-data-via-terms-and-conditions-says-eu-court-in-ryanair-case); [Osborne Clarke](https://marketinglaw.osborneclarke.com/media-and-ip/could-ryanair-control-use-of-its-flight-data-by-pr-aviation-without-database-right/); [The Register](https://www.theregister.com/2015/01/15/the_bottom_of_ryanair_data_barrel_must_be_left_unscrapped/)
- Commentators note the ruling leaves open who is a "lawful user" where protection does subsist, and enforceability depends on a contract actually being formed under national law — [Gowling WLG](https://gowlingwlg.com/en/insights-resources/articles/2015/ryanair-flying-high-at-the-cjeu)
- CV-Online Latvia v Melons (CJEU C-762/19, 3 June 2021): directly about job ads. Melons ran a specialised job search engine that indexed CV-Online's job-ad database, displayed its meta tags and hyperlinked to the original ads. The Court held such extraction/re-utilisation infringes the sui generis right where it adversely affects the database maker's investment (a balancing test that brings access-to-information and competition concerns into the analysis) — [Kluwer Copyright Blog (Husovec/Derclaye)](https://legalblogs.wolterskluwer.com/copyright-blog/access-to-information-and-competition-concerns-enter-the-sui-generis-rights-infringement-test-the-cjeu-redefines-the-database-right/); [Clifford Chance](https://cliffordchance.com/expertise/services/intellectual-property/global-ip-updates/2021/q4/cv-online-latvia-v-melons.html); [Bird & Bird](https://www.twobirds.com/en/insights/2021/uk/cv-online-latvia-cjeu-complicates-the-enforcement-of-database-rights)
- Innoweb v Wegener (CJEU C-202/12): the precedent CV-Online built on; a dedicated meta-search engine for used-car ads was held to breach the sui generis database right — [Kluwer Copyright Blog](https://legalblogs.wolterskluwer.com/copyright-blog/access-to-information-and-competition-concerns-enter-the-sui-generis-rights-infringement-test-the-cjeu-redefines-the-database-right/)

### Inferences
- Both leading CJEU database-right cases on vertical aggregators concern classified-style listings (cars, jobs), and Innoweb and Ryanair both originated in Dutch courts; a Dutch startup scraping Werkspot, Marktplaats or Freelance.nl is squarely in the fact patterns already litigated. Showing full listing content inside the app (substituting for a visit) is the riskiest design; a snippet plus deep link that sends traffic back is the most defensible under the CV-Online harm test, but still exposed to terms-of-use claims.
- Practical hierarchy for an MVP: (1) own first-party listings from contractors and clients, (2) negotiated feeds/affiliate APIs, (3) public tender data, (4) link-only indexing of public pages with robots.txt compliance; avoid logged-in scraping entirely.
- Translating scraped posts with an LLM and republishing them would count as re-utilisation of the content, so translation does not cure the database-right problem.

### Gaps
- Nothing retrieved on Google for Jobs structured data (JobPosting schema) or on which Dutch platforms offer partner feeds/APIs. UNVERIFIED (researcher memory): Google for Jobs indexes pages that publish schema.org JobPosting markup, which is aimed at employment vacancies rather than B2B assignments; TenderNed publishes open data on public tenders.
- GDPR implications of scraping listings that contain personal data (names, phone numbers of sole traders) and Dutch case law after 2021 were not researched.
- The exact paragraphs of the CV-Online harm test were not read in the primary judgment text.

## 6. Trust and wow mechanics: which ones move conversion and retention

### Takeaway
I found little quantified evidence ranking individual trust features; the best-supported mechanism is lead quality and customer choice (Angi: higher pro win rates and revenue per lead), followed by vetting as a paid-for product in itself (Checkatrade sells an "Approved" badge tier with no leads) and WhatsApp/voice speed-ups (company-reported 75% faster hiring).

### Cited Findings
- PROVEN (company-reported): when Angi made all leads homeowner-selected, pro win rates and customer satisfaction improved; revenue per lead rose 11% in Q3 2025 — [Quartr Q1 2025](https://quartr.com/events/angi-inc-angi-q1-2025_3e5aoGla); [Q3 2025 transcript](https://fintool.com/app/research/companies/ANGI/documents/transcripts/q3-2025)
- Checkatrade monetises verification itself: its "Approved" tier provides vetting status without leads, and the company publicises blocking of rogue trades — [Checkatrade blog](https://www.checkatrade.com/blog/trade/start-business/does-checkatrade-cost-money/); [Checkatrade, rogue trades blocked](https://www.checkatrade.com/blog/news/rogue-trades-blocked/)
- Checkatrade uses member-get-member referral rewards and a member benefits platform (retention mechanics beyond leads) — [Checkatrade referral terms](https://join.checkatrade.com/?p=235288); [Checkatrade benefits platform](https://www.checkatrade.com/blog/news/checkatrade-launches-new-benefits-platform-for-members)
- OPINION (Sacra): the labor platforms that resist leakage add post-match value: invoicing, payments, dispute handling and reputation systems — [Sacra](https://sacra.com/chat/h/829c3e65-8244-4aa1-8334-44c2d0ca8c63/)
- COMPANY-REPORTED: WhatsApp + voice AI cut frontline hiring time by 75% (Hunar.AI) — [GoodReturns](https://www.goodreturns.in/news/hunar-ai-s-voice-ai-speeds-up-frontline-hiring-cuts-recruitment-time-by-75-011-1499315.html)
- NEGATIVE EVIDENCE: the dominant complaints from pros are paying for unresponsive or multi-shopped leads and opaque, fluctuating lead prices — [Thumbtack community](https://community.thumbtack.com/discussion/2160/leads-payment); [Handyman Startup](https://handymanstartup.com/thumbtack-pro-reviews)

### Inferences
- The "wow" for a migrant ZZP'er is likely a sequence rather than one feature: speak in Polish for two minutes, get a verified Dutch profile, see relevant translated jobs within minutes, and never pay for a contact. Each step maps to a documented pain (points/lead fees, language, slow response).
- Verification (KvK, BTW-id, VCA, ID, insurance) has standalone value to main contractors facing chain-liability and schijnzelfstandigheid exposure, so it can be the demand-side wedge and a paid feature, as Checkatrade's badge-only tier suggests.
- Guaranteed or fast payment is probably the strongest retention and anti-leakage lever for subcontractors (late payment is the chronic construction pain), but this is inference from the leakage theory, not from data found here.

### Gaps
- No quantified evidence found on: instant payout or escrow effects on retention, KvK/VAT verification effects on conversion, review portability, price-benchmark transparency, gamification, or community features. UNVERIFIED (researcher memory): Instawork and Wonolo-type apps promote instant pay as a worker-acquisition feature; EU Data Act/DSA discussions touch on reputation portability; none verified.
- No academic studies on online labor-market reputation effects were retrieved in this session.

## 7. Monetization that avoids pay-per-lead, unit-economics benchmarks, and realistic MVP scope

### Takeaway
Documented alternatives to pay-per-lead are flat membership (Checkatrade, from about £30-59/month), SaaS subscription with free marketplace (Booksy, about $30/month plus roughly 2.75% payments), commission taken on payments processed (about 10% freelancer-side at Upwork/Malt, 20% at Fiverr) and client-pays placement fees (Wonolo). I found no sourced benchmarks for MVP cost, timeline or tech stack, so that part is inference only.

### Cited Findings
- Membership: Checkatrade from £30 + VAT/month (basic) with plans listed from £59/month; flexible membership introduced — [Checkatrade blog](https://www.checkatrade.com/blog/trade/start-business/does-checkatrade-cost-money/); [Checkatrade pricing](https://join.checkatrade.com/pricing); [Flexible membership](https://www.checkatrade.com/blog/trade/flexible-membership-is-here)
- SaaS + free marketplace: Booksy $29.99/month base, marketplace bookings free except via paid "Boost"; payment processing fee 2.75% — [Booksy comparison](https://biz.booksy.com/en-us/comparison/styleseat-comparison); [Koalendar](https://koalendar.com/blog/booksy-pricing). Third-party claim that payments/hardware are about 25% of Booksy revenue is unverified — [Vizologi](https://vizologi.com/business-strategy-canvas/booksy-business-model-canvas/)
- Commission on processed payments (estimates): Upwork 10% freelancer fee, Fiverr 20%, Malt ~10% + ~5% client — [Jobbers.io](https://www.jobbers.io/how-much-do-platforms-earn-from-freelancers-the-4-2b-fee-extraction-report-2026/)
- Client-pays: Wonolo charges businesses a fee per successful placement — [Dealroom](https://dealroom.co/companies/wonolo/)
- Pay-per-contact with partial refund: Oferteo refunds contacts worth 15% of purchased points — [Oferteo cennik](https://www.oferteo.pl/cennik)
- Profitability benchmark of a mature lead business: Angi Ads and Leads adjusted EBITDA $180M in 2024 on declining revenue, achieved through marketing efficiency and cost control — [IAC Q4 2024 release](https://sec.gov/Archives/edgar/data/0001800227/000180022725000006/ex_991q42024iac-pressrelea.htm)
- AI lowers matching cost from hundreds of dollars to a few dollars per match, enabling much lower commissions (example 1.5% vs 6%) — [a16z](https://a16z.com/marketplaces-in-the-age-of-ai-take-two-graveyard-to-greenfield/) (snippet only)
- Gurley/Lenny: err on the low side with the rake — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/take-rates)

### Inferences
- A model consistent with the evidence for NL trades: free to browse and respond (no points); revenue from (a) a low-priced worker subscription for the tool layer (AI offerte/factuur, translation, document vault, verified badge), (b) a client-side fee paid by main contractors/businesses for verified matching and compliance dossiers, and (c) a small percentage on optional guaranteed/fast payment. This places the charge on the convenience term of Lenny's formula rather than on access to demand.
- Worker willingness to pay about €10-30/month is plausible given Checkatrade and Booksy price points, but only once the tool is used weekly; before that, the client side or payments must fund the business.
- MVP scope for a small team (inference, no sourced benchmark): mobile-first PWA in Polish/Dutch/English; WhatsApp or SMS login and notifications; voice/text profile builder; first-party job posting for clients with AI structuring and translation; simple matching by trade, postcode radius and availability; KvK/VAT lookup; in-app translated chat; AI offerte PDF. Defer escrow/factoring, native apps, scraping-based aggregation and auto-apply agents. Payment marketplaces in NL are commonly built on Mollie Connect or Stripe Connect; holding client funds has licensing implications that need legal advice.

### Gaps
- No sourced figures for MVP build cost, timeline, PWA-versus-native trade-offs, Stripe Connect or Mollie marketplace fees, or typical CAC/LTV for trades marketplaces; these could not be researched within the tool budget. Any cost/timeline number in the final report would be an estimate, not evidence.
- No sourced unit-economics benchmarks (CAC per tradesperson, churn of paying pros, payback) for Checkatrade, Werkspot or Thumbtack.
- Dutch regulatory constraints on monetization (Waadi registration/allocation rules for intermediaries, DBA enforcement since 2025, PSD2 licensing for holding funds) were not researched here and should be taken from the legal-track researcher.
