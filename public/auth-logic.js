<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SSC | Authentication Center</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            font-family: 'Segoe UI', sans-serif;
            background: #090919;
            background-image: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #090919 70%);
            color: #fff;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .auth-container {
            display: flex;
            width: 90%;
            max-width: 1100px;
            background: rgba(25, 25, 50, 0.7);
            backdrop-filter: blur(15px);
            border-radius: 30px;
            border: 1px solid rgba(162, 155, 254, 0.3);
            overflow: hidden;
            box-shadow: 0 40px 100px rgba(0,0,0,0.8);
        }
        .login-side, .register-side { flex: 1; padding: 50px; box-sizing: border-box; }
        .login-side { border-right: 1px solid rgba(162, 155, 254, 0.2); background: rgba(10, 10, 30, 0.4); }
        h2 { color: #a29bfe; font-size: 24px; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 2px; }
        label { display: block; margin-bottom: 8px; font-size: 13px; color: #a29bfe; }
        input, select, textarea {
            width: 100%; padding: 14px; margin-bottom: 15px; border-radius: 10px;
            border: 1px solid rgba(162, 155, 254, 0.2); background: rgba(0, 0, 0, 0.3);
            color: white; font-size: 15px; box-sizing: border-box;
        }
        .file-input-label {
            background: rgba(162, 155, 254, 0.1); border: 1px dashed #a29bfe;
            padding: 10px; text-align: center; border-radius: 10px; cursor: pointer;
            margin-bottom: 15px; display: block;
        }
        button { width: 100%; padding: 15px; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; transition: 0.3s; text-transform: uppercase; }
        .btn-login { background: #6c5ce7; color: white; }
        .btn-reg { background: #2ecc71; color: white; }
        button:hover { transform: translateY(-2px); filter: brightness(1.2); }
        .hidden { display: none; }
    </style>
</head>
<body>

    <div class="auth-container">
        <div class="login-side">
            <h2><i class="fas fa-sign-in-alt"></i> Login</h2>
            <form id="loginForm">
                <label>Email Address</label>
                <input type="email" id="loginEmail" placeholder="Email" required>
                <label>Password</label>
                <input type="password" id="loginPass" placeholder="Password" required>
                <button type="submit" class="btn-login">Enter Dashboard</button>
            </form>
        </div>

        <div class="register-side">
            <h2><i class="fas fa-user-plus"></i> Registration</h2>
            <label>Select Account Type</label>
            <select id="userType" onchange="toggleFields()">
                <option value="">-- Choose Role --</option>
                <option value="partner">Join as a Partner</option>
                <option value="staff">Join as a Staff</option>
            </select>

            <form id="regForm" class="hidden">
                <div id="dynamicFields"></div>
                <label>Create Password</label>
                <input type="password" id="regPass" required>
                <button type="submit" class="btn-reg">Create Account</button>
            </form>
        </div>
    </div>

    <script>
        function toggleFields() {
    const type = document.getElementById('userType').value;
    const regForm = document.getElementById('regForm');
    const fields = document.getElementById('dynamicFields');
    
    if(!type) {
        regForm.classList.add('hidden');
        return;
    }

    regForm.classList.remove('hidden');
    fields.innerHTML = ""; 

    if(type === 'partner') {
        fields.innerHTML = `
            <input type="text" id="regOrgName" placeholder="Organisation Name" required>
            <input type="text" id="regFullName" placeholder="Authorised Person Name" required>
            <input type="text" id="regContact" placeholder="Contact No" required>
            <textarea id="regAddress" placeholder="Full Address"></textarea>
            <input type="email" id="regEmail" placeholder="Email Address" required>
            <label class="file-input-label">Upload NID (PDF) <input type="file" id="regNid" class="hidden" accept=".pdf"></label>
            <label class="file-input-label">Trade License (PDF) <input type="file" id="regTrade" class="hidden" accept=".pdf"></label>
            <input type="text" id="regWebsite" placeholder="Website URL (Optional)">
        `;
    } else if(type === 'staff') {
        fields.innerHTML = `
            <input type="text" id="regFullName" placeholder="Staff Full Name" required>
            <input type="text" id="regContact" placeholder="Contact No" required>
            <input type="text" id="regOrgName" placeholder="Organisation / Hub Name" required>
            <input type="text" id="regExpertCountries" placeholder="Expert Countries (e.g. UK, USA)" required>
            <input type="text" id="regExperience" placeholder="Experience Years" required>
            <input type="email" id="regEmail" placeholder="Personal Email Address" required>
            <label class="file-input-label">Upload CV/NID (PDF) <input type="file" id="regNid" class="hidden" accept=".pdf"></label>
        `;
    }
}

// Registration Logic
document.getElementById('regForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    
    // ফাইল সহ ডাটা পাঠাতে হলে FormData ব্যবহার করা ভালো
    const formData = {
        userType: document.getElementById('userType').value,
        fullName: document.getElementById('regFullName')?.value,
        email: document.getElementById('regEmail')?.value,
        password: document.getElementById('regPass').value,
        contact: document.getElementById('regContact')?.value,
        orgName: document.getElementById('regOrgName')?.value,
        address: document.getElementById('regAddress')?.value,
        expertCountries: document.getElementById('regExpertCountries')?.value,
        experience: document.getElementById('regExperience')?.value,
        website: document.getElementById('regWebsite')?.value
    };

    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        btn.disabled = true;

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (response.ok) {
            alert("Registration successful! Your account is pending for Admin Approval.");
            location.reload();
        } else {
            alert("Error: " + (result.message || result.msg));
        }
    } catch (err) {
        alert("Server connection failed! Please check if your backend is running.");
    } finally {
        btn.innerHTML = 'Create Account';
        btn.disabled = false;
    }
});

// Login Logic
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPass').value;

    try {
        // API endpoint চেক করুন (আপনার ব্যাকএন্ডে /api/auth/login হতে পারে)
        const response = await fetch('/api/auth/login', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token); // JWT token সেভ করা
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'dashboard.html';
        } else {
            alert(data.msg || "Invalid Credentials or Account Not Approved");
        }
    } catch (err) {
        alert("Login failed. Check server connection.");
    }
});
    </script>
</body>
</html>