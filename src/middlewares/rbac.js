
const accessModel = require("../models/access");
const ValidationError = require("../helpers/errors/validation");
const access = new accessModel();

function rbac(menuParam, accessParam) {
  return async (req, res, next) => {
    const roleId = req.user.role_id;
    if (roleId === 1) return next(); // langsung tanpa persyaratan karena id 1 adlaah superadmi
    const accessByRole = await access.getOne({ //middleware untuk user & admin sesuai dngn kebutuhan
      where: {
        role_id: roleId,
        grant: {
        path : [accessParam],
        equals : true
        },  
        menu : {
          is : {
          name : menuParam,
          }
        }
      },
    });
    console.log(accessByRole);

    if (!accessByRole) return next(new ValidationError("ACCESS FORBDIDEN")); //ketika akses tidak sesuai syarat
    return next();
  };
}

module.exports = rbac;
