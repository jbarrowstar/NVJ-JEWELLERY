import { useState } from 'react';
import { loginUser } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { toast } from 'react-hot-toast';
import logo from '../assets/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    const res = await loginUser({ email, password });
    if (res.success) {
      toast.success('Login successful!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } else {
      toast.error('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-garamond px-4">
      <div className="bg-white rounded shadow-md w-full max-w-md h-full max-h-[650px] flex flex-col p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-center mb-4 space-x-3">
          <img src={logo} alt="Nirvaha Logo" className="h-12 w-auto" />
          <h1 className="text-3xl text-[#CC9200] font-bold">NIRVAHA</h1>
        </div>

        {/* Welcome Text */}
        <p className="text-center text-gray-600 mb-6">
          Welcome to Nirvaha POS<br />
          Please enter your credentials to access the system.
        </p>

        {/* Form */}
        <div className="flex flex-col justify-center gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-2 border rounded pr-10"
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 cursor-pointer text-xl text-gray-500"
            >
              {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
            </span>
          </div>
        </div>

        {/* Button */}
        <div className="mt-6">
          <button
            onClick={handleLogin}
            className="w-full bg-[#CC9200] hover:bg-yellow-500 text-white font-bold py-2 rounded"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
