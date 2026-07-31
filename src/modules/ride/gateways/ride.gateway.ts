import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Injectable, Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "src/common/constants/user.constants";

@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/rides",
})
@Injectable()
export class RideGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RideGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      let token = client.handshake.auth.token || client.handshake.headers.token;

      this.logger.log(`🔑 Raw token: ${String(token).substring(0, 40)}`); // ← ADD

      if (!token) {
        client.disconnect();
        return;
      }

      if (token.startsWith("Bearer ")) {
        token = token.slice(7);
        this.logger.log(`🔑 Token after Bearer strip done`); // ← ADD
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get("jwt.secret"),
      });

      this.logger.log(
        `✅ Socket auth success: userId=${payload.sub} role=${payload.role}`,
      ); // ← ADD

      const userId = payload.sub as string;
      const role = payload.role as UserRole;

      client.data.userId = userId;
      client.data.role = role;

      client.join(`user_${userId}`);
      if (role === UserRole.RIDER) {
        client.join(`rider_${userId}`);
      }

      client.emit("connected", { message: "Connected to rides", userId, role });
    } catch (e) {
      this.logger.error("RideGateway auth failed", e as any);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Disconnected ${client.id}`);
  }

  emitRideRequestToRider(riderId: string, payload: any) {
    this.server.to(`rider_${riderId}`).emit("ride_request", payload);
    this.logger.log(`📡 ride_request emitted to rider_${riderId}`);
  }

  emitRideStatusToUser(userId: string, payload: any) {
    this.server.to(`user_${userId}`).emit("ride_status_updated", payload);
  }

  emitRideStatusToRider(riderId: string, payload: any) {
    this.server.to(`rider_${riderId}`).emit("ride_status_updated", payload);
  }

  /** Notify both passenger (`user_*`) and rider (`rider_*`) rooms. */
  emitRideStatusToParties(
    userId: string,
    riderId: string | null | undefined,
    payload: any,
  ) {
    this.emitRideStatusToUser(userId, payload);
    if (riderId) {
      this.emitRideStatusToRider(riderId, payload);
    }
  }

  emitRiderLocationToUser(userId: string, payload: any) {
    this.server.to(`user_${userId}`).emit("rider_location_updated", payload);
  }

  emitNewMessageToRideParties(
    userId: string,
    riderId: string | null,
    payload: any,
  ) {
    this.server.to(`user_${userId}`).emit("new_message", payload);
    if (riderId) {
      this.server.to(`rider_${riderId}`).emit("new_message", payload);
    }
  }
}
