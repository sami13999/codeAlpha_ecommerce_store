const dashboardService = require('./dashboardService');
const { successResponse, errorResponse } = require('../../../utils/apiResponse');

class AdminDashboardController {
  async getOverview(req, res, next) {
    try {
      const days = req.query.days || 14;
      const [metrics, trends, statusDist, recentOrders, lowStock, topProducts] = await Promise.all([
        dashboardService.getMetrics(),
        dashboardService.getSalesTrends(days),
        dashboardService.getStatusDistribution(),
        dashboardService.getRecentOrders(6),
        dashboardService.getLowStockAlerts(6),
        dashboardService.getTopSellingProducts(5)
      ]);

      return successResponse(res, {
        message: 'Admin dashboard overview retrieved',
        data: {
          metrics,
          trends,
          status_distribution: statusDist,
          recent_orders: recentOrders,
          low_stock_alerts: lowStock,
          top_products: topProducts
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getTrends(req, res, next) {
    try {
      const days = req.query.days || 14;
      const trends = await dashboardService.getSalesTrends(days);
      return successResponse(res, {
        message: 'Sales trends retrieved',
        data: trends
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminDashboardController();
