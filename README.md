# ChatNow - Real-time Messaging Application

A modern, feature-rich real-time messaging application built with React, Node.js, Socket.IO, and MongoDB.

## ✨ Features

- **Real-time Messaging**: Instant message delivery with Socket.IO
- **Direct Messages & Group Chats**: One-on-one conversations and group messaging
- **User Presence**: See who's online in real-time
- **Typing Indicators**: Know when someone is typing
- **Message Status**: Sent, delivered, and read receipts
- **Security Features**: AI-powered content moderation and scam detection
- **Profile Management**: Customizable profiles with photo uploads
- **Admin Dashboard**: User management and analytics
- **Responsive Design**: Beautiful UI that works on all devices
- **Fluid Animations**: Smooth transitions and micro-interactions
- **Emoji Support**: Express yourself with emojis

## 🚀 Tech Stack

### Frontend
- React 19
- React Router DOM
- Socket.IO Client
- Axios
- Tailwind CSS
- Emoji Picker React
- Vite

### Backend
- Node.js
- Express
- Socket.IO
- MongoDB with Mongoose
- JWT Authentication
- Bcrypt for password hashing
- Multer for file uploads

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the Backend directory:
```bash
cd Backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the Backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chatnow
JWT_SECRET=your_super_secret_jwt_key_here_change_this
NODE_ENV=development
```

4. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the Frontend directory:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the Frontend directory:
```env
VITE_backendurl=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## 🎨 Features Overview

### Authentication
- User registration with username availability check
- Secure login with JWT tokens
- Profile management with photo uploads
- Account deletion

### Messaging
- Real-time direct messaging
- Group chat creation and management
- Message history with infinite scroll
- Emoji picker integration
- Typing indicators
- Message status (sent/delivered/read)

### Security
- AI-powered content moderation
- Scam detection
- Rate limiting
- Secure password hashing
- JWT token authentication

### Admin Features
- User management dashboard
- Ban/unban users
- View platform statistics
- Monitor user activity

## 🎯 Usage

1. **Sign Up**: Create a new account with username, name, email, and password
2. **Login**: Sign in with your credentials
3. **Start Chatting**: Search for users and start conversations
4. **Create Groups**: Create group chats with multiple members
5. **Customize Profile**: Upload a profile photo and add an about section

## 🔧 Configuration

### Backend Configuration
Edit `Backend/.env` to configure:
- MongoDB connection string
- JWT secret key
- Server port
- Environment mode

### Frontend Configuration
Edit `Frontend/.env` to configure:
- Backend API URL

## 📱 Responsive Design

ChatNow is fully responsive and works seamlessly on:
- Desktop (1920px and above)
- Laptop (1024px - 1919px)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🎨 Design Features

- **Dark Theme**: Modern dark UI with carefully chosen colors
- **Fluid Animations**: Smooth transitions and micro-interactions
- **Glassmorphism**: Modern glass-like UI elements
- **Custom Scrollbars**: Styled scrollbars for better aesthetics
- **Loading States**: Skeleton loaders and spinners
- **Hover Effects**: Interactive hover states on all clickable elements

## 🔐 Security Best Practices

- Passwords are hashed using bcrypt
- JWT tokens for secure authentication
- HTTP-only cookies for token storage
- Input validation and sanitization
- Rate limiting on API endpoints
- Content moderation for messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support, email support@chatnow.com or open an issue in the repository.

## 🙏 Acknowledgments

- Socket.IO for real-time communication
- MongoDB for database
- React team for the amazing framework
- Tailwind CSS for styling utilities

---

Made with ❤️ by the ChatNow Team
