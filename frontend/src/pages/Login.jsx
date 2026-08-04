import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await api.post("/auth/login", { email, password });
      login(response.data.access_token);
      navigate("/expenses");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    }
  };

   return (
     <div className="page-container">
       <h2 className="page-title">Login</h2>
       <form onSubmit={handleSubmit}>
       <input
        type="email"
        placeholder="Email"
        className="form-input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        className="form-input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="error-text">{error}</p>}
      <button type="submit" className="btn-primary">Login</button>
      </form>
       <p className="link-text">No account? <Link to="/signup">Sign up</Link></p>
     </div>
  );
}

export default Login;