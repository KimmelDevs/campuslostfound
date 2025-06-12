# 🎒 campuslostfound

A modern lost and found web application designed for campus communities.  
Students can report **lost** or **found** items, **browse listings**, **chat with posters**, and **claim** items — all with a built-in verification system to protect student safety.

---

## 🧩 Features

- 📌 Post found or lost items with details and photos
- 🔍 Browse searchable lost & found listings
- 💬 Built-in chat system to message item owners/posters
- 🔐 Admin-verification required before items can be returned
- 🎓 Safe and student-focused environment

---

## ⚙️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/), [React](https://reactjs.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend/DB**: [Firebase](https://firebase.google.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: TypeScript
- **Package Manager**: npm

---

## 🛠️ Installation & Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/KimmelDevs/campuslostfound.git
cd campuslostfound

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
🔐 Environment Variables
Create a .env.local file and configure it with your Firebase credentials:

NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

📸 Screenshots
Homepage	Item Details
https://public/screenshots/background.jpg	https://public/screenshots/details.png
Chat System	Admin Panel
https://public/screenshots/chat.png	https://public/screenshots/admin.png


🤝 Contributing
Contributions are welcome!

Fork the repo

Create a new branch: git checkout -b feature/your-feature

Commit your changes: git commit -m "Add your feature"

Push to the branch: git push origin feature/your-feature

Open a Pull Request

📄 License
This project is licensed under the MIT License.

🙌 Acknowledgments
Developed with ❤️ by KimmelDevs
Built for a safer and more connected student community.