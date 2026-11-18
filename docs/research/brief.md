# Research brief: check DAILY 15's health guidance against UK sources

Paste this into a Claude chat with web search on, or a Claude Code session with web access to the repository TomCarewSuperco/Daily-15.

For each item below, find the current figure or advice on the NHS website, GOV.UK (SACN reports, the Eatwell Guide, UK Chief Medical Officers' guidelines) or the British Dietetic Association. Give one row per item: what the app says, what the source says, whether they match, the source URL and the date checked. Use only what the sources say; mark anything you can't find as 'not found'.

## Daily targets and limits (src/app/calc.ts)
1. Calorie estimate: Mifflin-St Jeor equation with activity factors 1.2, 1.375, 1.55, 1.725 and 1.9.
2. Fat loss: a deficit of at most 500 kcal a day, capped at 20% of maintenance.
3. Calorie floor: 1,200 kcal for women, 1,500 for men.
4. Protein: 1.8 g per kg when losing fat or building muscle, 1.4 g per kg otherwise.
5. Fat: 30% of energy.
6. Fibre: 30 g a day.
7. Water: 30 ml per kg, between 1.5 and 3.5 litres.
8. Saturated fat: no more than 30 g a day for men and 20 g for women. Is a percentage of energy (believed 10%) the current SACN advice?
9. Sugars: the app limits total sugars to 90 g (the label reference intake). What does SACN advise for free sugars (believed no more than 5% of energy, about 30 g for adults)? How should an app that can only measure total sugars handle this?
10. Salt: no more than 6 g a day.
11. Steps: targets of 6,000 to 12,000 by activity level. Is there UK guidance on steps?

## Weekly review (src/app/review.ts)
12. Safe rate of weight loss: the app calls more than 1% of body weight a week too fast, and 0.25% to 1% on track. What does the NHS advise (believed 0.5 to 1 kg a week)?
13. Adjusting targets by 150 kcal at a time, no more than once every two weeks.
14. Alcohol: no more than 14 units a week, spread over three or more days, with several drink-free days.
15. Strength training on at least two days a week (UK CMO physical activity guidelines).
16. Five a day: 80 g a portion; juice counts once a day (150 ml); beans and pulses count once a day.
17. Lowering cholesterol: soluble fibre (oats, beans), unsaturated fats instead of saturated, oily fish twice a week.

## Pregnancy and breastfeeding (src/app/pregnancy.ts)
18. Folic acid: 400 micrograms a day until 12 weeks.
19. Vitamin D: 10 micrograms a day in pregnancy and while breastfeeding.
20. Iron: from food; tablets only if advised.
21. Avoid vitamin A supplements, fish liver oil, liver and pâté.
22. Cheeses: avoid mould-ripened, blue and unpasteurised soft cheeses unless cooked until steaming hot.
23. Raw or undercooked meat; eggs that aren't British Lion stamped unless fully cooked.
24. Cured meats such as salami and chorizo; cold-smoked or cured fish.
25. Shark, swordfish and marlin: avoid in pregnancy; no more than one portion a week while breastfeeding.
26. Oily fish: no more than two portions a week. Any tuna limit?
27. Alcohol: none in pregnancy; occasional at most while breastfeeding.
28. Caffeine: under 200 mg a day. Figures: mug of instant coffee 100 mg, filter coffee 140 mg, tea 75 mg, can of cola 40 mg, 250 ml energy drink 80 mg, 50 g plain chocolate under 25 mg, 50 g milk chocolate under 10 mg.
29. Calories: none extra in the first six months; about 200 extra a day in the last three.
30. Exercise: avoid lying flat on the back after about 16 weeks; avoid contact sports and activities with a risk of falling.
31. Check that these NHS links still work:
    - https://www.nhs.uk/pregnancy/keeping-well/have-a-healthy-diet/
    - https://www.nhs.uk/pregnancy/keeping-well/foods-to-avoid/
    - https://www.nhs.uk/pregnancy/keeping-well/vitamins-supplements-and-nutrition/
    - https://www.nhs.uk/pregnancy/keeping-well/exercise/
    - https://www.nhs.uk/baby/breastfeeding-and-bottle-feeding/breastfeeding/diet/

## Food data
32. Licence for McCance and Widdowson's Composition of Foods Integrated Dataset 2021 on GOV.UK: is it the Open Government Licence, and what attribution does it require?

Finish with a list of items that don't match, and open questions for a registered dietitian. Research doesn't replace a dietitian's sign-off.
