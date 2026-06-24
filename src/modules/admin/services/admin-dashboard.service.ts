import { Injectable } from '@nestjs/common';
import { RevenueGraphPeriod } from 'src/common/constants/admin.constants';
import { UserRole } from 'src/common/constants/user.constants';
import { CommissionRateRepository } from 'src/shared/repositories/commission-rate.repository';
import { RideRepository } from 'src/shared/repositories/ride.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { AdminDashboardRevenueQueryDto } from '../dto/admin-dashboard-revenue-query.dto';

const DEFAULT_COMMISSION = 18;

@Injectable()
export class AdminDashboardService {
    constructor(
        private readonly rideRepository: RideRepository,
        private readonly userRepository: UserRepository,
        private readonly commissionRateRepository: CommissionRateRepository,
    ) {}

    private async getCommissionRate(): Promise<number> {
        const latest = await this.commissionRateRepository.getLatest();
        return latest?.percentage ?? DEFAULT_COMMISSION;
    }

    async getStats() {
        const [totalRevenue, totalDrivers, totalBookings, totalUsers, commissionRate] = await Promise.all([
            this.rideRepository.countCompletedPaidRevenue(),
            this.userRepository.countActiveByRole(UserRole.RIDER),
            this.rideRepository.countAllBookings(),
            this.userRepository.countActiveByRole(UserRole.USER),
            this.getCommissionRate(),
        ]);

        const totalProfit = Math.round(totalRevenue * (commissionRate / 100) * 100) / 100;

        const [revenueGraph, userSignups, driverSignups] = await Promise.all([
            this.rideRepository.aggregateRevenueGraph(RevenueGraphPeriod.MONTHLY),
            this.userRepository.aggregateMonthlySignups(UserRole.USER),
            this.userRepository.aggregateMonthlySignups(UserRole.RIDER),
        ]);

        const profitSparkline = revenueGraph.map((p) =>
            Math.round(p.revenue * (commissionRate / 100) * 100) / 100,
        );

        return {
            stats: {
                totalRevenue,
                totalDrivers,
                totalBookings,
                totalUsers,
                totalProfit,
                commissionRate,
            },
            sparklines: {
                totalRevenue: revenueGraph.map((p) => p.revenue),
                totalDrivers: driverSignups.map((p) => p.count),
                totalBookings: revenueGraph.map((p) => p.bookings),
                totalUsers: userSignups.map((p) => p.count),
                totalProfit: profitSparkline,
            },
        };
    }

    async getRevenueGraph(query: AdminDashboardRevenueQueryDto) {
        const period = query.period ?? RevenueGraphPeriod.MONTHLY;
        const data = await this.rideRepository.aggregateRevenueGraph(period);
        return {
            period,
            data,
        };
    }
}
