import { Routes, Route, Navigate } from "react-router-dom";
import { RequireCustomer, RequireStaff } from "./components/Guards";
import CustomerLayout from "./components/CustomerLayout";
import StaffLayout from "./components/StaffLayout";

// Customer pages
import CustomerLogin    from "./pages/customer/Login";
import CustomerRegister from "./pages/customer/Register";
import CustomerHome     from "./pages/customer/Home";
import Catalogue        from "./pages/customer/Catalogue";
import Orders           from "./pages/customer/Orders";
import OrderDetail      from "./pages/customer/OrderDetail";
import Profile          from "./pages/customer/Profile";

// Staff pages
import StaffLogin       from "./pages/staff/StaffLogin";
import StaffDashboard   from "./pages/staff/Dashboard";
import Customers           from "./pages/staff/Customers";
import CustomerDetail       from "./pages/staff/CustomerDetail";
import StaffOrders          from "./pages/staff/Orders";
import StaffOrderDetail     from "./pages/staff/OrderDetail";
import CatalogueManagement  from "./pages/staff/CatalogueManagement";
import Analytics            from "./pages/staff/Analytics";
import Stock                from "./pages/staff/Stock";
import Plants               from "./pages/staff/Plants";
import PlantDetail          from "./pages/staff/PlantDetail";
import Configuration        from "./pages/staff/Configuration";
import DesignPreview        from "./pages/DesignPreview";


export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/design-preview" element={<DesignPreview />} />
      <Route path="/login"       element={<CustomerLogin />} />
      <Route path="/register"    element={<CustomerRegister />} />
      <Route path="/staff/login" element={<StaffLogin />} />

      {/* Customer portal */}
      <Route path="/"           element={<RequireCustomer><CustomerLayout><CustomerHome /></CustomerLayout></RequireCustomer>} />
      <Route path="/catalog"    element={<RequireCustomer><CustomerLayout><Catalogue /></CustomerLayout></RequireCustomer>} />
      <Route path="/orders"     element={<RequireCustomer><CustomerLayout><Orders /></CustomerLayout></RequireCustomer>} />
      <Route path="/orders/:id" element={<RequireCustomer><CustomerLayout><OrderDetail /></CustomerLayout></RequireCustomer>} />
      <Route path="/profile"    element={<RequireCustomer><CustomerLayout><Profile /></CustomerLayout></RequireCustomer>} />

      {/* Staff portal */}
      <Route path="/staff"              element={<RequireStaff><StaffLayout><StaffDashboard /></StaffLayout></RequireStaff>} />
      <Route path="/staff/customers"     element={<RequireStaff roles={["admin","central_team","sales"]}><StaffLayout><Customers /></StaffLayout></RequireStaff>} />
      <Route path="/staff/customers/:id" element={<RequireStaff roles={["admin","central_team","sales"]}><StaffLayout><CustomerDetail /></StaffLayout></RequireStaff>} />
      <Route path="/staff/orders"        element={<RequireStaff><StaffLayout><StaffOrders /></StaffLayout></RequireStaff>} />
      <Route path="/staff/orders/:id"    element={<RequireStaff><StaffLayout><StaffOrderDetail /></StaffLayout></RequireStaff>} />
      <Route path="/staff/catalog"       element={<RequireStaff roles={["admin","central_team"]}><StaffLayout><CatalogueManagement /></StaffLayout></RequireStaff>} />
      <Route path="/staff/analytics"    element={<RequireStaff roles={["admin","central_team","sales"]}><StaffLayout><Analytics /></StaffLayout></RequireStaff>} />
      <Route path="/staff/stock"        element={<RequireStaff roles={["admin","central_team","operations"]}><StaffLayout><Stock /></StaffLayout></RequireStaff>} />
      <Route path="/staff/plants"       element={<RequireStaff roles={["admin","central_team","operations"]}><StaffLayout><Plants /></StaffLayout></RequireStaff>} />
      <Route path="/staff/plants/:id"   element={<RequireStaff roles={["admin","central_team","operations"]}><StaffLayout><PlantDetail /></StaffLayout></RequireStaff>} />
      <Route path="/staff/config"       element={<RequireStaff roles={["admin","central_team","operations"]}><StaffLayout><Configuration /></StaffLayout></RequireStaff>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
