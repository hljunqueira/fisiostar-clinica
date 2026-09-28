---
version: 1.0.0
name: FisioStar-Clinica-Design-System
description: "A clean, therapeutic, and soothing healthcare design system. Built on medical ocean blue (#0284C7), mint restorative green (#14B8A6), and gentle alabaster surfaces. Conveys clinical precision, patient empathy, and physical rehabilitation expertise."

colors:
  primary: "#0284C7"
  primary-hover: "#0369A1"
  on-primary: "#FFFFFF"
  secondary: "#14B8A6"
  canvas: "#F8FAFC"
  surface-1: "#FFFFFF"
  surface-2: "#F0FDF4"
  surface-blue: "#F0F9FF"
  ink: "#0F172A"
  ink-muted: "#475569"
  ink-subtle: "#94A3B8"
  hairline: "#E2E8F0"
  status-scheduled: "#0284C7"
  status-confirmed: "#10B981"
  status-completed: "#059669"
  status-cancelled: "#94A3B8"

typography:
  font-sans: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif"
  scale:
    headline: { fontSize: "28px", fontWeight: "700" }
    section: { fontSize: "20px", fontWeight: "600" }
    card-title: { fontSize: "16px", fontWeight: "600" }
    body: { fontSize: "15px", fontWeight: "400", lineHeight: "1.6" }

elevation:
  gentle: "0 2px 10px rgba(2, 132, 199, 0.05)"
  card: "0 4px 15px rgba(15, 23, 42, 0.04)"

radius:
  field: "8px"
  card: "12px"
  pill: "9999px"

components:
  appointment-card:
    layout: "Destaque para horário com badge colorido, especialidade (Pilates, Traumato, RPG) e dados do fisioterapeuta."
  patient-record:
    anamnesis: "Visual limpo, espaçado, com histórico de sessões em timeline intuitiva."
---
