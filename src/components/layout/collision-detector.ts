export class CollisionDetector {
	constructor(private readonly minDistance: number) {}

	hasCollision(x: number, y: number, existingPositions: Map<string, { x: number; y: number }>): boolean {
		for (const pos of existingPositions.values()) {
			const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
			if (distance < this.minDistance) {
				return true;
			}
		}
		return false;
	}

	collidesWithBounds(
		x: number,
		y: number,
		bounds: Array<{ minX: number; maxX: number; minY: number; maxY: number }>,
		padding: number
	): boolean {
		return bounds.some((b) => {
			return x >= b.minX - padding && x <= b.maxX + padding && y >= b.minY - padding && y <= b.maxY + padding;
		});
	}

	/**
	 * Uses spiral search pattern with increasing radius when all angles at current radius fail.
	 * Accepts collision check function to allow different collision strategies.
	 */
	findValidPosition(
		centerX: number,
		centerY: number,
		baseRadius: number,
		baseAngle: number,
		checkCollision: (x: number, y: number) => boolean,
		options: {
			maxAngleAttempts?: number;
			maxRadiusAttempts?: number;
			radiusIncrement?: number;
		} = {}
	): { x: number; y: number } {
		const { maxAngleAttempts = 36, maxRadiusAttempts = 5, radiusIncrement = 30 } = options;

		let currentRadius = baseRadius;

		for (let radiusAttempt = 0; radiusAttempt < maxRadiusAttempts; radiusAttempt++) {
			// Try different angles at this radius
			for (let angleAttempt = 0; angleAttempt < maxAngleAttempts; angleAttempt++) {
				const angleOffset = (angleAttempt * 2 * Math.PI) / maxAngleAttempts;
				const angle = baseAngle + angleOffset;
				const x = centerX + currentRadius * Math.cos(angle);
				const y = centerY + currentRadius * Math.sin(angle);

				if (!checkCollision(x, y)) {
					return { x, y };
				}
			}

			// All angles at this radius failed, increase radius
			currentRadius += radiusIncrement;
		}

		// Fallback: Return the original position even if it collides
		return {
			x: centerX + currentRadius * Math.cos(baseAngle),
			y: centerY + currentRadius * Math.sin(baseAngle),
		};
	}

	findValidPositionSimple(
		centerX: number,
		centerY: number,
		baseRadius: number,
		baseAngle: number,
		checkCollision: (x: number, y: number) => boolean,
		maxAttempts = 36
	): { x: number; y: number } {
		let x = centerX + baseRadius * Math.cos(baseAngle);
		let y = centerY + baseRadius * Math.sin(baseAngle);

		let attempts = 0;
		while (checkCollision(x, y) && attempts < maxAttempts) {
			attempts++;
			const adjustedAngle = baseAngle + (attempts * Math.PI) / 18;
			const adjustedRadius = baseRadius + Math.floor(attempts / 12) * 30;
			x = centerX + adjustedRadius * Math.cos(adjustedAngle);
			y = centerY + adjustedRadius * Math.sin(adjustedAngle);
		}

		return { x, y };
	}
}
