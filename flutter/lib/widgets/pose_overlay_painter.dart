import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// A single pose landmark point, normalized 0.0–1.0 relative to the
/// camera preview's width/height (this is the format MediaPipe/TFLite
/// outputs — x,y in [0,1], z is relative depth).
///
/// TODO (integration): once Shantanu's pose_service is ready, replace the
/// mock keypoint generator in CameraTestScreen with the real stream of
/// these points coming off the pose detection pipeline.
class PosePoint {
  final double x;
  final double y;
  final double confidence;

  const PosePoint({
    required this.x,
    required this.y,
    this.confidence = 1.0,
  });
}

/// The 33 MediaPipe Pose landmark indices we actually need for a simple
/// skeleton overlay (a subset is enough for a readable stick figure —
/// full 33-point mapping can be added once the real pipeline is wired).
class PoseSkeleton {
  final PosePoint? nose;
  final PosePoint? leftShoulder;
  final PosePoint? rightShoulder;
  final PosePoint? leftElbow;
  final PosePoint? rightElbow;
  final PosePoint? leftWrist;
  final PosePoint? rightWrist;
  final PosePoint? leftHip;
  final PosePoint? rightHip;
  final PosePoint? leftKnee;
  final PosePoint? rightKnee;
  final PosePoint? leftAnkle;
  final PosePoint? rightAnkle;

  const PoseSkeleton({
    this.nose,
    this.leftShoulder,
    this.rightShoulder,
    this.leftElbow,
    this.rightElbow,
    this.leftWrist,
    this.rightWrist,
    this.leftHip,
    this.rightHip,
    this.leftKnee,
    this.rightKnee,
    this.leftAnkle,
    this.rightAnkle,
  });
}

/// Draws a stick-figure skeleton overlay on top of the live camera preview.
class PoseOverlayPainter extends CustomPainter {
  final PoseSkeleton skeleton;

  PoseOverlayPainter({required this.skeleton});

  @override
  void paint(Canvas canvas, Size size) {
    final pointPaint = Paint()
      ..color = AppColors.secondary
      ..style = PaintingStyle.fill;

    final linePaint = Paint()
      ..color = AppColors.secondary
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;

    Offset? toOffset(PosePoint? p) {
      if (p == null) return null;
      return Offset(p.x * size.width, p.y * size.height);
    }

    void drawBone(PosePoint? a, PosePoint? b) {
      final oa = toOffset(a);
      final ob = toOffset(b);
      if (oa != null && ob != null) {
        canvas.drawLine(oa, ob, linePaint);
      }
    }

    // Torso + limbs
    drawBone(skeleton.leftShoulder, skeleton.rightShoulder);
    drawBone(skeleton.leftShoulder, skeleton.leftElbow);
    drawBone(skeleton.leftElbow, skeleton.leftWrist);
    drawBone(skeleton.rightShoulder, skeleton.rightElbow);
    drawBone(skeleton.rightElbow, skeleton.rightWrist);
    drawBone(skeleton.leftShoulder, skeleton.leftHip);
    drawBone(skeleton.rightShoulder, skeleton.rightHip);
    drawBone(skeleton.leftHip, skeleton.rightHip);
    drawBone(skeleton.leftHip, skeleton.leftKnee);
    drawBone(skeleton.leftKnee, skeleton.leftAnkle);
    drawBone(skeleton.rightHip, skeleton.rightKnee);
    drawBone(skeleton.rightKnee, skeleton.rightAnkle);

    // Joint dots
    final allPoints = [
      skeleton.nose,
      skeleton.leftShoulder,
      skeleton.rightShoulder,
      skeleton.leftElbow,
      skeleton.rightElbow,
      skeleton.leftWrist,
      skeleton.rightWrist,
      skeleton.leftHip,
      skeleton.rightHip,
      skeleton.leftKnee,
      skeleton.rightKnee,
      skeleton.leftAnkle,
      skeleton.rightAnkle,
    ];

    for (final point in allPoints) {
      final offset = toOffset(point);
      if (offset != null) {
        canvas.drawCircle(offset, 5, pointPaint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant PoseOverlayPainter oldDelegate) {
    return true; // pose updates every frame, always repaint
  }
}
