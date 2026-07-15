import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../theme/app_theme.dart';
import '../widgets/pose_overlay_painter.dart';
import '../services/api_service.dart';
import '../services/device_id_service.dart';

/// Camera + live-feed test screen.
///
/// Backend contract (confirmed from result.schema.js):
///   POST /api/v1/results
///   { athleteId, testType, rawScore, timestamp, deviceId,
///     faceMatchVerified, stabilityVerified, gpsCoords?, liveGuidance? }
///
/// testType MUST be one of: speed_run, standing_jump, sit_ups, push_ups,
/// shuttle_run, flexibility — NOT the old "pushup"/"vertical_jump" names.
///
/// Only scout/admin/teacher roles can submit (roleGuard on the route) —
/// this matches this screen being reached via Teacher Home's roster, not
/// a student self-submitting.
///
/// NOTE: the rep-counting UI here (extended/flexed cycle) is built for
/// push_ups / sit_ups specifically. speed_run, standing_jump, shuttle_run,
/// and flexibility would need different measurement UI — out of scope for
/// this screen as built; flag to the team if those test types are needed
/// for the MVP demo.
///
/// STILL MOCK: pose detection itself (_mockPoseTimer). Satyam's job per
/// the integration doc is to delete _mockPoseTimer and wire the real
/// MediaPipe/TFLite stream here.
class CameraTestScreen extends StatefulWidget {
  const CameraTestScreen({
    super.key,
    required this.studentId, // must be the athlete's MongoDB _id
    required this.studentName,
    this.testType = 'push_ups', // must match backend enum exactly
  });

  final String studentId;
  final String studentName;
  final String testType;

  @override
  State<CameraTestScreen> createState() => _CameraTestScreenState();
}

class _CameraTestScreenState extends State<CameraTestScreen> {
  CameraController? _cameraController;
  bool _isCameraReady = false;
  String? _cameraError;

  Timer? _mockPoseTimer;
  PoseSkeleton _currentSkeleton = const PoseSkeleton();

  bool _isTestRunning = false;
  int _repCount = 0;
  bool _wasExtended = true;
  final List<String> _liveGuidance = [];

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() => _cameraError = 'No camera found on this device');
        return;
      }
      final camera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(camera, ResolutionPreset.medium, enableAudio: false);
      await controller.initialize();
      if (!mounted) return;
      setState(() {
        _cameraController = controller;
        _isCameraReady = true;
      });
    } catch (e) {
      setState(() => _cameraError = 'Camera error: $e');
    }
  }

  void _startTest() {
    setState(() {
      _isTestRunning = true;
      _repCount = 0;
      _wasExtended = true;
      _liveGuidance.clear();
    });

    // MOCK pose stream — Satyam replaces this with the real pose_service
    // stream per the integration doc (Step 3.2).
    final random = Random();
    double phase = 0;
    _mockPoseTimer = Timer.periodic(const Duration(milliseconds: 100), (_) {
      phase += 0.15;
      final cycle = (sin(phase) + 1) / 2;

      final skeleton = PoseSkeleton(
        nose: PosePoint(x: 0.5, y: 0.15 + cycle * 0.05),
        leftShoulder: PosePoint(x: 0.4, y: 0.28),
        rightShoulder: PosePoint(x: 0.6, y: 0.28),
        leftElbow: PosePoint(x: 0.32, y: 0.28 + cycle * 0.15),
        rightElbow: PosePoint(x: 0.68, y: 0.28 + cycle * 0.15),
        leftWrist: PosePoint(x: 0.28, y: 0.28 + cycle * 0.28),
        rightWrist: PosePoint(x: 0.72, y: 0.28 + cycle * 0.28),
        leftHip: PosePoint(x: 0.42, y: 0.52),
        rightHip: PosePoint(x: 0.58, y: 0.52),
        leftKnee: PosePoint(x: 0.42, y: 0.72),
        rightKnee: PosePoint(x: 0.58, y: 0.72),
        leftAnkle: PosePoint(x: 0.42, y: 0.92),
        rightAnkle: PosePoint(x: 0.58, y: 0.92),
      );

      setState(() => _currentSkeleton = skeleton);

      final isExtended = cycle < 0.25;
      final isFlexed = cycle > 0.75;

      if (isFlexed && _wasExtended) {
        _wasExtended = false;
      } else if (isExtended && !_wasExtended) {
        setState(() {
          _repCount++;
          _wasExtended = true;
        });
      }

      if (random.nextDouble() < 0.01 && _liveGuidance.length < 3) {
        setState(() => _liveGuidance.add('Keep your back straight'));
      }
    });
  }

  void _stopTest() {
    _mockPoseTimer?.cancel();
    setState(() => _isTestRunning = false);
  }

  Future<void> _submitResult() async {
    setState(() => _isSubmitting = true);

    try {
      final deviceId = await DeviceIdService.instance.getOrCreateDeviceId();

      final response = await ApiService.instance.post('/results', body: {
        'athleteId': widget.studentId,
        'testType': widget.testType, // e.g. 'push_ups'
        'rawScore': _repCount,
        'timestamp': DateTime.now().toUtc().toIso8601String(),
        'deviceId': deviceId,
        // TODO (Satyam, Step 3.4): set these from real FaceNet + accelerometer
        // checks instead of hardcoding false.
        'faceMatchVerified': false,
        'stabilityVerified': false,
        if (_liveGuidance.isNotEmpty) 'liveGuidance': _liveGuidance,
      });

      final data = ApiService.instance.unwrap(response);

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Result submitted'),
          content: Text(
            '${widget.studentName} completed $_repCount reps.\n'
            '${data['zScore'] != null ? 'Z-score: ${data['zScore']}' : 'Z-score pending (baseline table not yet seeded)'}',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pop(context);
              },
              child: const Text('Done'),
            ),
          ],
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Network error: $e')),
      );
    }
  }

  @override
  void dispose() {
    _mockPoseTimer?.cancel();
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text('${widget.studentName} — Test'),
      ),
      body: _cameraError != null
          ? _CameraErrorView(message: _cameraError!)
          : !_isCameraReady
              ? const Center(child: CircularProgressIndicator(color: Colors.white))
              : Stack(
                  fit: StackFit.expand,
                  children: [
                    CameraPreview(_cameraController!),
                    if (_isTestRunning)
                      CustomPaint(painter: PoseOverlayPainter(skeleton: _currentSkeleton)),
                    if (_isTestRunning)
                      Positioned(
                        top: AppSpacing.md,
                        left: 0,
                        right: 0,
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.lg,
                              vertical: AppSpacing.sm,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.6),
                              borderRadius: BorderRadius.circular(AppRadius.xl),
                            ),
                            child: Text(
                              '$_repCount reps',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                    if (_isTestRunning && _liveGuidance.isNotEmpty)
                      Positioned(
                        top: 80,
                        left: AppSpacing.md,
                        right: AppSpacing.md,
                        child: Wrap(
                          spacing: AppSpacing.sm,
                          children: _liveGuidance
                              .map(
                                (g) => Chip(
                                  label: Text(g, style: const TextStyle(fontSize: 11)),
                                  backgroundColor: AppColors.accent.withOpacity(0.9),
                                  labelStyle: const TextStyle(color: Colors.white),
                                ),
                              )
                              .toList(),
                        ),
                      ),
                    Positioned(
                      bottom: AppSpacing.xl,
                      left: AppSpacing.lg,
                      right: AppSpacing.lg,
                      child: _isTestRunning
                          ? ElevatedButton(
                              onPressed: _stopTest,
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                              child: const Text('Stop Test'),
                            )
                          : Row(
                              children: [
                                Expanded(
                                  child: ElevatedButton(
                                    onPressed: _startTest,
                                    child: const Text('Start Test'),
                                  ),
                                ),
                                if (_repCount > 0) ...[
                                  const SizedBox(width: AppSpacing.md),
                                  Expanded(
                                    child: ElevatedButton(
                                      onPressed: _isSubmitting ? null : _submitResult,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.secondary,
                                      ),
                                      child: _isSubmitting
                                          ? const SizedBox(
                                              height: 20,
                                              width: 20,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2.5,
                                                color: Colors.white,
                                              ),
                                            )
                                          : const Text('Submit'),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                    ),
                  ],
                ),
    );
  }
}

class _CameraErrorView extends StatelessWidget {
  final String message;
  const _CameraErrorView({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.videocam_off_rounded, size: 48, color: Colors.white54),
            const SizedBox(height: AppSpacing.md),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70)),
          ],
        ),
      ),
    );
  }
}
