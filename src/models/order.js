const BaseModel = require("./base");

//inheritance
class OrderModel extends BaseModel {
  constructor() {
    super("order");
    this.select = {
        id: true,
        order_no: true,
      
        users:{
          select : {
          fullname: true
          }
        },
        cars:{
          select : {
          name: true,
          img : true,
          }
        },
        status: true,
        overdue_time : true,
        is_driver : true,
        start_time : true,
        end_time : true,
        payment_method: true,
        total : true,
        
    };
  }
}

module.exports = OrderModel
