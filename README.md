# BFHL — Full Stack Engineering Challenge

## Project Structure
```
/
├── backend/     → Node.js/Express API  (POST /bfhl)
└── frontend/    → Static HTML/JS/CSS frontend
```

---

## Backend

### Local Development
```bash
cd backend
npm install
node index.js          # runs on http://localhost:3000
```

### Environment Variables
Before deploying, set these in your host's dashboard:

| Variable       | Description                          | Example                          |
|---------------|--------------------------------------|----------------------------------|
| `USER_ID`     | fullname_ddmmyyyy                    | `johndoe_17091999`               |
| `EMAIL_ID`    | Your college email                   | `john.doe@srmist.edu.in`         |
| `ROLL_NUMBER` | Your college roll number             | `RA2211003010001`                |
| `PORT`        | (optional) default 3000              | `10000`                          |

### Deploy to Render
1. Push code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Select your repo, set Root Directory to `backend`
4. Build command: `npm install`  
5. Start command: `node index.js`
6. Add the environment variables above
7. Deploy — note your `https://xxx.onrender.com` URL

---

## Frontend

### Local Development
Open `frontend/index.html` in any browser.  
Set the **API URL** field to `http://localhost:3000/bfhl`.

### Deploy to Vercel
```bash
cd frontend
npx vercel --prod
```
Or connect the repo in [vercel.com](https://vercel.com) → set Root Directory to `frontend`.

After deploying the backend, update the default API URL in `frontend/index.html` (line with `value="http://localhost:3000/bfhl"`) to your live Render URL.

---

## API Reference

### POST /bfhl
```http
POST /bfhl
Content-Type: application/json

{
  "data": ["A->B", "A->C", "B->D", "hello", "1->2"]
}
```

Returns a full response with hierarchies, invalid entries, duplicates, and summary.

---

## GitHub Checklist
- [ ] Repository is **public**
- [ ] `backend/` and `frontend/` directories committed
- [ ] `.env` / secrets NOT committed (use host env vars)
- [ ] Backend deployed and accessible via HTTPS
- [ ] Frontend deployed and accessible via HTTPS
- [ ] API URL in frontend updated to live backend URL
