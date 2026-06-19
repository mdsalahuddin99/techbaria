# 🤖 AI Assistant — Master Instructions

> **This file is your binding contract. Read it before every task.**
> Violating any rule below is a breach of trust.

---

## 🛑 Rule 1: আমি যা বলি শুধু TAI করো — বেশি কিছু নয়

```
❌ "Brand ফিল্ডে AutoSuggest বসাও" → brand + model + series সব যোগ করা
✅ শুধু Brand — বেশি কিছু না
```

- আমি যা বলি **ঠিক তাই** করবে। Extra feature, refactor, improvement — নিষিদ্ধ।
- "এটাও যোগ করে দিতে পারি?" — জিজ্ঞেসও করবে না।
- শুধু মিনিমাম পরিবর্তন — যেটুকু না করলেই নয়, ঠিক সেটুকু।

---

## 🛑 Rule 2: কোড করার আগে PLAN দাও — আমি OK বললে করবে

```
❌ সরাসরি Edit/Write করে ফেলা
✅ "প্ল্যান: ১) X ফাইল পড়বো ২) Y পরিবর্তন করবো ৩) Z প্রভাব। OK বলেন?"
```

- কোনো কোড পরিবর্তনের আগে **প্ল্যান দাও** — কোন ফাইল, কী পরিবর্তন, কী প্রভাব।
- আমি **"ok"** বা **"কর"** বলার পরই কেবল শুরু করবে।
- ছোট পরিবর্তন (১-২ লাইন) হলে সংক্ষিপ্ত প্ল্যান দিলেই চলবে।

---

## 🛑 Rule 3: পড়ো — তারপর করো — তারপর চেক করো

| ধাপ | বাধ্যতামূলক | ব্যতিক্রম |
|-----|-------------|-----------|
| **পড়ো** | বিদ্যমান ফাইল Read না করে Edit/Write করা যাবে না | নতুন ফাইল তৈরি |
| **করো** | Edit/Write — টুল ব্যবহার করবে | Shell/git নিষিদ্ধ (আমি না বললে) |
| **চেক করো** | GetDiagnostics → ০ error | Build error? → ফিরিয়ে আনো |

---

## 🛑 Rule 4: নতুন ফাইল তৈরি নিষিদ্ধ — unless I explicitly say

```
❌ "AutoSuggest দরকার" → src/shared/ui/AutoSuggest.tsx বানিয়ে ফেলা
✅ src/shared/ui/auto-suggest.tsx (already exists) — O saja use কোরো
```

- **বিদ্যমান ফাইল ইডিট করবে** — নতুন ফাইল তৈরি করা যাবে না।
- Exception: আমি স্পষ্টভাবে বললে ("একটি ফাইল তৈরি করো")।
- Exception: `loading.tsx` — Next.js convention (পৃথক ফাইল প্রয়োজন)।

---

## 🛑 Rule 5: API / DB / Schema — পরিবর্তন নিষিদ্ধ

```
❌ কোনো API route পরিবর্তন
❌ Prisma Schema পরিবর্তন
❌ Migration তৈরি
✅ শুধু Frontend কম্পোনেন্ট — API already exists
```

| এলাকা | অনুমতি | ব্যতিক্রম |
|-------|--------|-----------|
| `app/(dashboard)/` | ✅ | — |
| `app/(storefront)/` | ✅ | — |
| `src/features/` | ✅ | — |
| `src/shared/ui/` | ✅ | — |
| `app/api/` | ❌ | আমি স্পষ্টভাবে বললে |
| `prisma/schema.prisma` | ❌ | আমি স্পষ্টভাবে বললে |
| `src/server/services/` | ❌ | আমি স্পষ্টভাবে বললে |

---

## 🛑 Rule 6: Git — স্পর্শ করা যাবে না

- `git add`, `git commit`, `git push` — নিষিদ্ধ।
- আমি না বলা পর্যন্ত কোনো git operation করবে না।

---

## 🛑 Rule 7: পাওয়ারফুল টুল ব্যবহার করবে — shell নয়

| কাজ | টুল | নিষিদ্ধ |
|-----|-----|---------|
| ফাইল পড়া | `Read` | `cat`, `head` |
| ফাইল এডিট | `Edit` | `sed`, `awk` |
| ফাইল সার্চ | `Grep` | `find`, `rg` |
| ফাইল খোঁজা | `Glob` | `ls -R` |

- Shell (`RunCommand`) শুধু DevOps কাজের জন্য — build, dev server, prisma generate।

---

## 🛑 Rule 8: Error দেখলে — নিজে থেকে ফিক্স করবে না

```
❌ Error → "আমি ঠিক করে দিচ্ছি" → অন্য ফাইল পরিবর্তন
✅ Error → "এই error টি X কারণে হচ্ছে। আপনি কি ঠিক করবেন?"
```

- Error দেখলে **প্রথমে আমাকে জানাবে** — কারণ ব্যাখ্যা করবে।
- আমি বললে তবেই ফিক্স করবে।
- Error যত ছোটই হোক — নিজে থেকে ফিক্স করা যাবে না।

---

## 🛑 Rule 9: Over-engineering নিষিদ্ধ

```
❌ ৩ লাইনের জন্য utility function বানানো
❌ "ভবিষ্যতে কাজে লাগবে" — দরকার নেই
❌ Config/folder structure পরিবর্তন
✅ Keep it simple — minimum change, maximum clarity
```

- "What if…", "Later we might need…" — দরকার নেই।
- শুধু বর্তমান সমস্যা সমাধান — future-proofing নিষিদ্ধ।

---

## 🛑 Rule 10: ভাষা ও কমিউনিকেশন

- আমি বাংলায় লিখলে — তুমিও বাংলায় উত্তর দেবে।
- Code comments — ইংরেজি (project convention)।
- আমি ইংরেজিতে লিখলে — তুমিও ইংরেজিতে।

---

## 📋 Quick Checklist (প্রতি Task-এর আগে)

```
[ ] Rule 1: শুধু যা বলা হয়েছে — বেশি কিছু না?
[ ] Rule 2: প্ল্যান দিয়েছি? OK নিয়েছি?
[ ] Rule 3: পড়েছি? করেছি? চেক করেছি?
[ ] Rule 4: নতুন ফাইল? — explicit permission?
[ ] Rule 5: API/DB পরিবর্তন? — explicit permission?
[ ] Rule 6: Git? — না
[ ] Rule 7: সঠিক টুল ব্যবহার করছি?
[ ] Rule 8: Error? — user কে জানিয়েছি?
[ ] Rule 9: Over-engineering? — না
```

---

**এই নিয়ম ভঙ্গ করা মানে — আপনি আমার উপর আস্থা হারাবেন।** ⚠️
