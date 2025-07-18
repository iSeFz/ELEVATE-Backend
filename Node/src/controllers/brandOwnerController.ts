import { Request, Response } from 'express';
import * as BrandOwnerService from '../services/brandOwner.js';
import * as ProductService from '../services/product.js';
import * as OrderService from '../services/order.js';
import { roles } from '../config/roles.js';
import { getSubscriptionPlanDetails } from '../config/subscriptionPlans.js';

/**
 * Get all brand owners (admin only)
 */
export const getAllBrandOwners = async (req: Request, res: Response) => {
    try {
        const brandOwners = await BrandOwnerService.getAllBrandOwners();
        res.status(200).json({
            status: 'success',
            data: brandOwners
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

/**
 * Get a brand owner by ID
 */
export const getBrandOwner = async (req: Request, res: Response) => {
    try {
        const brandOwnerId = req.user!.id;
        const userRole = req.user!.role;
        const brandOwner = await BrandOwnerService.getBrandOwnerById(brandOwnerId, userRole);

        if (!brandOwner) {
            return res.status(404).json({
                status: 'error',
                message: 'Brand owner not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                ...brandOwner,
                role: roles[userRole] // Include the role from the request user
            }
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

export const getMyProducts = async (req: Request, res: Response) => {
    try {
        const brandOwnerId = req.user?.id;
        const userRole = req.user?.role;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 9;
        if (!brandOwnerId) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }
        const brandOwner = await BrandOwnerService.getBrandOwnerById(brandOwnerId, userRole);
        if (!brandOwner) {
            return res.status(404).json({ status: 'error', message: 'Brand owner not found' });
        }
        const results = await ProductService.getProductsByBrand(brandOwner.brandId, page, limit);
        results.products.forEach(product => {
            product.brandSubscriptionPlan = getSubscriptionPlanDetails(product.brandSubscriptionPlan as number).name;
        })
        return res.status(200).json({ status: 'success', data: results.products, pagination: results.pagination });
    } catch (error: any) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
}

/**
 * Update a brand owner
 */
export const updateBrandOwner = async (req: Request, res: Response) => {
    try {
        const brandOwnerId = req.user!.id;
        const userRole = req.user!.role;
        const updatedBrandOwner = await BrandOwnerService.updateBrandOwner(brandOwnerId, req.body, userRole);

        if (!updatedBrandOwner) {
            return res.status(404).json({
                status: 'error',
                message: 'Brand owner/manager not found'
            });
        }

        res.status(200).json({
            status: 'success',
            message: updatedBrandOwner ? 'Brand owner updated successfully' : 'Brand owner not found'
        });
    } catch (error: any) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

/**
 * Delete a brand owner and their associated brand
 */
export const deleteBrandOwner = async (req: Request, res: Response) => {
    try {
        const brandOwnerId = req.user!.id;

        // 1. Get the brand owner to find the associated brand
        const brandOwner = await BrandOwnerService.getBrandOwnerById(brandOwnerId);

        if (!brandOwner) {
            return res.status(404).json({
                status: 'error',
                message: 'Brand owner not found'
            });
        }

        // 2. Get the brand ID
        const brandId = brandOwner.brandId;

        // 3. Import brand service
        const brandService = await import('../services/brand.js');

        // 4. Delete both the brand and brand owner
        // We'll first delete the brand and then the brand owner to maintain integrity
        let brandDeleted = false;

        if (brandId) {
            brandDeleted = await brandService.deleteBrand(brandId);

            // If the brand deletion failed, we should not proceed with deleting the brand owner
            if (!brandDeleted) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to delete associated brand'
                });
            }
        }

        // 5. Delete the brand owner
        const brandOwnerDeleted = await BrandOwnerService.deleteBrandOwner(brandOwnerId);

        if (!brandOwnerDeleted) {
            return res.status(500).json({
                status: 'error',
                message: 'Brand owner found but deletion failed'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Brand owner and associated brand deleted successfully'
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

export const getBrandReviewsSummary = async (req: Request, res: Response) => {
    try {
        const brandOwnerId = req.user!.id;
        const brandOwner = await BrandOwnerService.getBrandOwnerById(brandOwnerId);

        if (!brandOwner) {
            return res.status(404).json({
                status: 'error',
                message: 'Brand owner not found'
            });
        }

        const reviewsSummary = await BrandOwnerService.getBrandReviewsSummary(brandOwner.brandId);
        res.status(200).json({
            status: 'success',
            data: reviewsSummary
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/**
 * Get comprehensive brand owner dashboard data
 * Unified endpoint that provides current month stats, reviews summary, and sales chart
 */
export const getBrandOwnerMonthSalesStats = async (req: Request, res: Response) => {
    try {
        const brandOwnerId = req.user!.id;
        const {
            months = '12',
            topProducts = '10'
        } = req.query;

        // Validate brand owner
        const brandOwner = await BrandOwnerService.getBrandOwnerById(brandOwnerId);
        if (!brandOwner) {
            return res.status(404).json({
                status: 'error',
                message: 'Brand owner not found'
            });
        }

        // Validate and parse parameters
        const topProductsLimit = parseInt(topProducts as string);
        if (isNaN(topProductsLimit) || topProductsLimit < 1 || topProductsLimit > 50) {
            return res.status(400).json({
                status: 'error',
                message: 'topProducts must be a number between 1 and 50'
            });
        }

        const monthsBack = parseInt(months as string);
        if (isNaN(monthsBack) || monthsBack < 1 || monthsBack > 24) {
            return res.status(400).json({
                status: 'error',
                message: 'months parameter must be between 1 and 24'
            });
        }

        // Get unified dashboard data
        const data = await BrandOwnerService.getBrandOwnerMonthSalesStats(
            brandOwner.brandId,
            {
                monthsBack: monthsBack,
                topProductsLimit: topProductsLimit
            }
        );

        res.status(200).json({
            status: 'success',
            data,
        });

    } catch (error: any) {
        console.error('Error in getBrandOwnerDashboard:', error);
        res.status(500).json({
            status: 'error',
            message: error.message ?? 'Internal server error'
        });
    }
};

/**
 * Get brand products currently in processing status
 * Shows quantity and order statistics for each product
 */
export const getBrandProductsInProcessing = async (req: Request, res: Response) => {
    try {
        const brandOwnerId = req.user!.id;
        const brandOwner = await BrandOwnerService.getBrandOwnerById(brandOwnerId);

        if (!brandOwner) {
            return res.status(404).json({
                status: 'error',
                message: 'Brand owner not found'
            });
        }

        const processingProducts = await OrderService.getBrandProductsInProcessing(brandOwner.brandId);

        res.status(200).json({
            status: 'success',
            data: {
                brandId: brandOwner.brandId,
                brandName: brandOwner.brandName,
                totalProducts: processingProducts.length,
                totalQuantityInProcessing: processingProducts.reduce((sum, p) => sum + p.totalQuantity, 0),
                totalOrdersInProcessing: processingProducts.reduce((sum, p) => sum + p.totalOrders, 0),
                products: processingProducts
            }
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

/**
 * Get brand products with refund requests
 * Shows quantity and refund statistics for each product
 */
export const getBrandProductsRefunded = async (req: Request, res: Response) => {
    try {
        const brandOwnerId = req.user!.id;
        const brandOwner = await BrandOwnerService.getBrandOwnerById(brandOwnerId);

        if (!brandOwner) {
            return res.status(404).json({
                status: 'error',
                message: 'Brand owner not found'
            });
        }

        const refundedProducts = await OrderService.getBrandProductsRefunded(brandOwner.brandId);

        const summary = {
            totalPending: refundedProducts.reduce((sum, p) => sum + p.refundStats.pending, 0),
            totalApproved: refundedProducts.reduce((sum, p) => sum + p.refundStats.approved, 0),
            totalRejected: refundedProducts.reduce((sum, p) => sum + p.refundStats.rejected, 0)
        };

        res.status(200).json({
            status: 'success',
            data: {
                brandId: brandOwner.brandId,
                brandName: brandOwner.brandName,
                totalProducts: refundedProducts.length,
                totalQuantityRefunded: refundedProducts.reduce((sum, p) => sum + p.totalQuantity, 0),
                totalOrdersWithRefunds: refundedProducts.reduce((sum, p) => sum + p.totalOrders, 0),
                refundSummary: summary,
                products: refundedProducts
            }
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};
