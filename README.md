# K8.CURA ∞

კლინიკური გადაწყვეტილების მხარდამჭერი სისტემა (CDSS) გადაუდებელი მედიცინისა და ენდოკრინოლოგიისთვის.

## სტეკი

- React 19 + Vite 6 + Tailwind 4 (frontend)
- Vercel Serverless Function (`/api/med-detail.js`) მედიკამენტების ცოცხალი სინქრონიზაციისთვის Aversi/PSP-ის საიტებიდან (Cheerio-ით)

## ლოკალური გაშვება

**წინაპირობა:** Node.js 18+ და [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)

```bash
npm install
vercel dev
```

`vercel dev`-ის გამოყენება აუცილებელია (და არა უბრალო `vite`), რადგან ის `/api` საქაღალდეში არსებულ სერვერლეს ფუნქციებსაც უშვებს ლოკალურად — ზუსტად ისე, როგორც პროდაქშენში იმუშავებს.

## დეპლოი Vercel-ზე

1. გადადით [vercel.com](https://vercel.com) და დააკავშირეთ ეს რეპოზიტორი (ან გაუშვით `vercel` CLI-დან).
2. Vercel ავტომატურად ამოიცნობს Vite ფრეიმვორკს (`npm run build`, output: `dist`) და `/api/med-detail.js`-ს დამატებით სერვერლეს ფუნქციად.
3. დამატებითი Environment Variables არ არის საჭირო — სკრეიპერს გარე API გასაღები არ სჭირდება.

## სტრუქტურა

```
├── api/
│   └── med-detail.js   # Vercel Serverless Function — Aversi/PSP სკრეიპინგი (Cheerio)
├── src/
│   ├── App.tsx
│   ├── data.ts
│   ├── types.ts
│   └── main.tsx
├── index.html
├── vite.config.ts
└── vercel.json
```
