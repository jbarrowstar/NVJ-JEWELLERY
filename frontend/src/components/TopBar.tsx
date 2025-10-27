import logo from '../assets/logo.png';
import profile from '../assets/profile.jpg';

export default function TopBar({
  setShowConfirm,
}: {
  setShowConfirm: (value: boolean) => void;
}) {
  return (
    <div className="bg-white shadow px-4 py-3 flex items-center justify-between w-full z-50 relative">
      {/* Left: Logo + Name */}
      <div className="flex items-center space-x-3 pl-2">
        <img src={logo} alt="Logo" className="h-10 w-auto" />
        <h1 className="text-xl font-bold text-yellow-600">NIRVAHA</h1>
      </div>

      {/* Center: Search */}
      <input
        type="text"
        placeholder="Search products, customers..."
        className="hidden sm:block border px-3 py-1 rounded w-1/2"
      />

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowConfirm(true)}
          className="bg-red-500 text-white px-3 py-1 rounded"
        >
          Logout
        </button>
        <img src={profile} alt="User" className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}
