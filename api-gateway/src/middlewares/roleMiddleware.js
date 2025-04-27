const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          message: `Role ${req.user.role} is not allowed to access this resource`
        });
      }
      next();
    };
  };
  
  module.exports = authorizeRoles;