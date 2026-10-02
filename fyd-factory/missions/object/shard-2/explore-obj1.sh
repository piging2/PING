cd /home/nolan/projects/ping
grep -n "function Contact\|const Contact" src/fyd/components/renderer.tsx
awk "/function ContactSection/,/^}/" src/fyd/components/renderer.tsx | head -80
