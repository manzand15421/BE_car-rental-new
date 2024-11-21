const Joi = require("joi");
const express = require("express");

const BaseController = require("../base");
const OrderModel = require("../../models/order");
const CarsModel = require("../../models/cars");
const { authorize, checkRole } = require("../../middlewares/authorization");
const ValidationError = require("../../helpers/errors/validation");
const { createInvoice } = require("../../helpers/createInvoice");
const router = express.Router();

const order = new OrderModel();
const cars = new CarsModel();

const orderSchema = Joi.object({
  car_id: Joi.number().required(),
  start_time: Joi.date().required(),
  end_time: Joi.date().required(),
  is_driver: Joi.boolean().required(),
  payment_method: Joi.string().required(),
});

const orderUpdateSchema = Joi.object({
  start_time: Joi.date().required(),
  end_time: Joi.date().required(),
  is_driver: Joi.boolean().required(),
  payment_method: Joi.string().required(),
});
const PROMOS = [
  {
    title: "DISKONTIT",
    discount: 10,
    expired_date: "21/11/2024",
  },
  {
    title: "DISKONCOW",
    discount: 15,
    expired_date: "21/11/2024",
  },
  {
    title: "DISKONBIG",
    discount: 20,
    expired_date: "21/11/2024",
  },
];

class OrderController extends BaseController {
  constructor(model) {
    super(model);
    router.get("/", this.getAll);
    router.post("/", this.validation(orderSchema), authorize, this.create);
    router.get("/myorder", authorize, this.getMyOrder);
    router.get("/:id", this.getOrderDetail);
    router.get("/:id/invoice", authorize, this.downloadInvoice);
    router.put("/:id/payment", authorize, this.payment);
    router.put("/:id/cancelOrder", authorize, this.OrderCancel);
    router.put(
      "/:id/updateOrder",
      authorize,
      this.validation(orderUpdateSchema),
      this.OrderUpdate
    );

    // router.put("/:id", this.validation(carSchema), authorize, checkRole(['admin']), this.update);
    // router.delete("/:id", this.delete);
  }

  getOrderDetail = async (req,res,next) => {
   
    try {
    const {id} = req.params
    const order = await this.model.getById(id, {
      select: {
        order_no: true,
        start_time: true,
        end_time: true,
        is_driver: true,
        status: true,
        createdBy: true,
        updatedBy: true,
        payment_method: true,
        overdue_time: true,
        total : true,
        cars: {
          select: {
            id: true,
            name: true,
            img: true,
          },
        },
        users: {
          select: {
            id: true,
            fullname: true,
            address: true,
          },
        },
      },
    });


    return res.status(200).json(
      this.apiSend({
        code: 200,
        status: "success",
        message: "Order created successfully",
        data: order,
      })
    );
  } catch (error) {
    return next(error);
  }
  }

  getMyOrder = async (req, res, next) => {
    try {
      const getOrder = await this.model.get({
        where: {
          user_id: req.user.id,
        },
      });

      return res.status(200).json(
        this.apiSend({
          code: 200,
          status: "success",
          message: "Data Fetched Successfully",
          data: getOrder,
        })
      );
    } catch (error) {
      return next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const getCars = await cars.getOne({
        where: {
          id: req.body.car_id,
          isAvailable: true,
          // isDriver: req.body.is_driver,
        },
        select: {
          price: true,
        },
      });

      if (!getCars)
        return next(new ValidationError("Car not found or is not available!"));

      const getLastOrderToday = await this.model.count({
        where: {
          createdDt: {
            lte: new Date(),
          },
        },
      });
      const currentDate = new Date();
      const startTime = new Date(req.body.start_time);
      const endTime = new Date(req.body.end_time);
      const total =
        getCars.price * ((endTime - startTime) / 1000 / 60 / 60 / 24);
      const invNumber = `INV/${currentDate.getFullYear()}/${
        currentDate.getMonth() + 1
      }/${currentDate.getDate()}/${getLastOrderToday + 1}`;

      const [result, carUpdate] = await this.model.transaction([
        this.model.set({
          order_no: invNumber,
          start_time: startTime,
          end_time: endTime,
          is_driver: req.body.is_driver,
          status: "pending",
          createdBy: req.user.fullname,
          updatedBy: req.user.fullname,
          payment_method: req.body.payment_method,
          overdue_time: new Date(Date.now() + (7 + 24) * 60 * 60 * 1000),
          total,
          cars: {
            connect: {
              id: req.body.car_id,
            },
          },
          users: {
            connect: {
              id: req.user.id,
             
            },
          },
         
        },),
        cars.update(req.body.car_id, { isAvailable: false }),
      ]);

      const order = await this.model.getById(result.id, {
        select: {
          id:true,
          order_no: true,
          start_time: true,
          end_time: true,
          is_driver: true,
          status: true,
          createdBy: true,
          updatedBy: true,
          payment_method: true,
          overdue_time: true,
          total : true,
          cars: {
            select: {
              id: true,
              name: true,
              img: true,
            },
          },
          users: {
            select: {
              id: true,
              fullname: true,
              address: true,
            },
          },
        },
      });


      return res.status(200).json(
        this.apiSend({
          code: 200,
          status: "success",
          message: "Order created successfully",
          data: order,
        })
      );
    } catch (error) {
      return next(error);
    }
  };

  payment = async (req, res, next) => {
    const { id } = req.params;
    try {
      const { receipt } = req.body;

      const orderPaid = await this.model.update(id, {
        receipt,
        status: "paid",
      });

      return res.status(200).json(
        this.apiSend({
          code: 200,
          status: "success",
          message: "Order Paid successfully",
          data: orderPaid,
        })
      );
    } catch (error) {
      return next(error);
    }
  };

  OrderCancel = async (req, res, next) => {
    try {
      const order = await this.model.getById(req.params.id);
      if (!order)
        return next(new ValidationError("Order Not Found or is not available"));
      const getCars = await this.model.getOne(order.car_id);
      if (!getCars)
        return next(new ValidationError("Cars not found or is not available"));

      await cars.update(order.car_id, {
        isAvailable: true,
      });

      const orderCanceled = await this.model.update(order.id, {
        status: "canceled",
      });

      return res.status(200).json(
        this.apiSend({
          code: 200,
          status: "success",
          message: "Order Canceled Successfully",
          data: orderCanceled,
        })
      );
    } catch (error) {
      return next(error);
    }
  };

  OrderUpdate = async (req, res, next) => {
    const startTime = new Date(req.body.start_time);
    const endTime = new Date(req.body.end_time);

    try {
      
      const order = await this.model.getById(req.params.id);
      if (!order)
        return next(new ValidationError("Order Not Found or is not available"));
      const getCars = await this.model.getOne(order.car_id);
      if (!getCars)
        return next(new ValidationError("Cars not found or is not available"));

      const newPrice = await cars.getOne({
        where: {
          id: order.car_id,
        },
        select: {
          price: true,
        },
      });

      const total =
        newPrice.price * ((endTime - startTime) / 1000 / 60 / 60 / 24);
      console.log(total);

      const orderUpdate = await this.model.update(order.id, {
        
        start_time: startTime,
        end_time: endTime,
        is_driver: req.body.is_driver,
        payment_method: req.body.payment_method,
        overdue_time: new Date(Date.now() + (7 + 24) * 60 * 60 * 1000),
        total,
      },);

      const orders = await this.model.getById(order.id, {
        select: {
          id : true,
          order_no: true,
          start_time: true,
          end_time: true,
          is_driver: true,
          user_id: true,
          status: true,
          createdBy: true,
          updatedBy: true,
          payment_method: true,
          overdue_time: true,
          total : true,
          cars: {
            select: {
              id: true,
              name: true,
              img: true,
            },
          },
          users: {
            select: {
              id: true,
              fullname: true,
              address: true,
            },
          },
        },
      });

      return res.status(200).json(
        this.apiSend({
          code: 200,
          status: "success",
          message: "Order Updated Successfully",
          data: orders,
        })
      );
    } catch (error) {
      return next(error);
    }
  };

  downloadInvoice = async (req, res, next) => {
    const { id } = req.params;
    try {
      const order = await this.model.getById(id, {
        select: {
          order_no: true,
          createdDt: true,
          status: true,
          user_id: true,
          start_time: true,
          end_time: true,
          total: true,
          cars: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
          users: {
            select: {
              id: true,
              fullname: true,
              address: true,
            },
          },
        },
      });
      if (order.status !== "paid") {
        return next(new ValidationError("Order not paid!"));
      }

      createInvoice(order, res);
    } catch (error) {
      return next(error);
    }
  };
}

new OrderController(order);

module.exports = router;
