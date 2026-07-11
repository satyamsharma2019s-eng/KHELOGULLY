import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../theme/app_theme.dart';
import '../widgets/pose_overlay_painter.dart';

/// Camera + live-feed test screen.
///
/// IMPORTANT (read before wiring real data):
/// - Only the AGGREGATED result object is ever sent to the backend via
///   POST /api/v1/results — never raw video or frames.
/// - Confirm the exact result JSON shape with Shantanu BEFORE wiring the
///   final submit call. The shape assumed below (in _submitResult) is a
///   reasonable guess based on the project doc, not a confirmed contract.
/// - Pose detection itself (MediaPipe/TFLite) runs entirely on-device and
///   is Shantanu's deliverable — this screen currently uses a MOCK
///   skeleton generator (_mockPoseStream) so the UI/rep-counting logic
///   can be built and tested independently of the ML pipeline being ready.
///   Swap _mockPoseStream for the real pose_service stream when it lands.
class CameraTestScreen extends StatefulWidget {
  const CameraTestScreen({
    super.key,
    required this.studentId,
    required this.studentName,
    this.testType = 'pushup',
  });

  final String studentId;
  final String studentName;
  final String testType; // "vertical_jump" | "pushup" | "situp"

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
  bool _wasExtended = true; // tracks elbow angle cycle: extended <-> flexed
  final List<String> _liveGuidance = [];
  DateTime? _testStartTime;

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
      final controller = CameraController(
        camera,
        ResolutionPreset.medium,
        enableAudio: false,
      );
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
      _testStartTime = DateTime.now();
    });

    // MOCK pose stream — replace with real pose_service stream later.
    // Simulates elbow-angle cycling so rep-counting logic can be tested
    // end-to-end without the real ML pipeline.
    final random = Random();
    double phase = 0;
    _mockPoseTimer = Timer.periodic(const Duration(milliseconds: 100), (_) {
      phase += 0.15;
      final cycle = (sin(phase) + 1) / 2; // 0..1 oscillation

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

      // Mock rep-counting: elbow "angle" approximated by the cycle value.
      // Real version: arccos of shoulder-elbow-wrist vectors from Shantanu's
      // math_engine — threshold >160° extended -> <90° flexed -> >160° = 1 rep.
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

      // Random occasional live guidance, mimicking loggable correction
      // events (liveGuidance array shape TBD with Shantanu).
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

    final durationSeconds =
        _testStartTime != null ? DateTime.now().difference(_testStartTime!).inSeconds : 0;

    // TODO: confirm this exact shape with Shantanu before wiring for real.
    // Only this aggregated object is sent — never video/frames.
    final resultPayload = {
      'athleteId': widget.studentId,
      'testType': widget.testType,
      'rawScore': _repCount,
      'unit': 'reps',
      'durationSeconds': durationSeconds,
      'liveGuidance': _liveGuidance,
      'timestamp': DateTime.now().toIso8601String(),
    };

    // TODO: wire to POST /api/v1/results with resultPayload above,
    // through the auth interceptor (needs a valid access token).
    debugPrint('Result payload (mock submit): $resultPayload');
    await Future.delayed(const Duration(seconds: 1));

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Result submitted'),
        content: Text(
          '${widget.studentName} completed $_repCount reps in ${durationSeconds}s.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context); // close dialog
              Navigator.pop(context); // back to roster
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
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
              ? const Center(
                  child: CircularProgressIndicator(color: Colors.white),
                )
              : Stack(
                  fit: StackFit.expand,
                  children: [
                    // Live camera preview
                    CameraPreview(_cameraController!),

                    // Pose skeleton overlay
                    if (_isTestRunning)
                      CustomPaint(
                        painter: PoseOverlayPainter(skeleton: _currentSkeleton),
                      ),

                    // Top rep counter badge
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

                    // Live guidance chips
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
                                  label: Text(
                                    g,
                                    style: const TextStyle(fontSize: 11),
                                  ),
                                  backgroundColor: AppColors.accent.withOpacity(0.9),
                                  labelStyle: const TextStyle(color: Colors.white),
                                ),
                              )
                              .toList(),
                        ),
                      ),

                    // Bottom controls
                    Positioned(
                      bottom: AppSpacing.xl,
                      left: AppSpacing.lg,
                      right: AppSpacing.lg,
                      child: _isTestRunning
                          ? ElevatedButton(
                              onPressed: _stopTest,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.error,
                              ),
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
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70),
            ),
          ],
        ),
      ),
    );
  }
}
