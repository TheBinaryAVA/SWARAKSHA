# 🛡️ SURAKSHA – AI-Driven Safe Routing System

Built by Girls in STEM 💡

SURAKSHA is an AI-powered navigation system that prioritizes **safety over speed**, helping users travel confidently by recommending the safest possible routes instead of just the shortest ones.

---

## 💡 Inspiration

We built SURAKSHA from a real-world problem.

In today’s world, people often adjust their travel plans—not for convenience, but for safety. Many avoid certain routes, travel at specific times, or hesitate to move freely due to safety concerns.

This inspired us to ask:

> What if navigation didn’t just guide people… but protected them?

SURAKSHA was created to bridge this gap and empower safer mobility for everyone.

---

## 🚀 What it does

SURAKSHA is an intelligent routing system that:

- 🧭 Suggests **safest routes**, not just shortest ones  
- ⚠️ Analyzes real-time risk factors:
  - Unsafe zones  
  - Poor lighting  
  - Isolation levels  
  - Weather conditions  
  - Time of travel  
- 🌍 Supports **multiple transportation modes**  
- 🗣️ Offers a **multi-language user interface**  
- 🏥 Identifies **nearby safe zones** (hospitals, police stations, public areas)  
- 🚨 Includes a **one-tap SOS feature** for emergencies  

---

## 🛠️ How we built it

SURAKSHA is built as a full-stack web application.

### Frontend
- React.js  
- Tailwind CSS  
- Interactive Map UI (Google Maps / Mapbox)

### Backend
- Node.js  
- Express.js  

### APIs Used
- Google Maps API → routing & location services  
- Geolocation API → real-time user tracking  
- Weather API → environmental risk assessment  
- Places API → safe zone detection  

---

## 🧠 Risk Scoring Model

Each route is evaluated using a weighted safety model:

```math
Risk = w1(Crime) + w2(Lighting) + w3(Isolation) + w4(Weather) + w5(Time)

<img width="959" height="499" alt="S1" src="https://github.com/user-attachments/assets/55fcacba-7f5c-4bdf-9fe3-7300a6ddc5cb" />

<img width="958" height="490" alt="S2" src="https://github.com/user-attachments/assets/16ea8a19-d318-4b38-9bd2-e9986e1f3493" />
<img width="949" height="479" alt="S3" src="https://github.com/user-attachments/assets/edafeff6-ee21-45bc-9720-7fe1d52aa30b" />
<img width="957" height="482" alt="S4" src="https://github.com/user-attachments/assets/7227f990-5731-4e02-80a5-8e2de51e33e1" />



