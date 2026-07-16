/// Shared data models used across screens.
/// These mirror the shapes described in the backend contract doc —
/// keep them in sync with whatever Siddharth/Sanskriti finalize.

class EnrollmentModel {
  final String id;
  final String schoolOrRegion;
  final DateTime enrolledAt;
  final String status; // "active" | "inactive" — inactive means withdrawn

  EnrollmentModel({
    required this.id,
    required this.schoolOrRegion,
    required this.enrolledAt,
    required this.status,
  });

  factory EnrollmentModel.fromJson(Map<String, dynamic> json) {
    return EnrollmentModel(
      id: json['_id'] ?? json['id'] ?? '',
      schoolOrRegion: json['schoolOrRegion'] ?? '',
      enrolledAt: json['enrolledAt'] != null
    ? DateTime.tryParse(json['enrolledAt']) ?? DateTime.now()
    : DateTime.now(),
      status: json['status'] ?? 'active',
    );
  }
}

class TestResultModel {
  final String id;
  final String testType; // "vertical_jump" | "pushup" | "situp"
  final double rawScore;
  final String unit;
  final DateTime timestamp;
  final double? zScore;
  final double? percentile;
  final String syncStatus; // "local" | "synced"

  TestResultModel({
    required this.id,
    required this.testType,
    required this.rawScore,
    required this.unit,
    required this.timestamp,
    this.zScore,
    this.percentile,
    this.syncStatus = 'local',
  });

  factory TestResultModel.fromJson(Map<String, dynamic> json) {
    return TestResultModel(
      id: json['_id'] ?? json['id'] ?? '',
      testType: json['testType'] ?? '',
      rawScore: (json['rawScore'] ?? 0).toDouble(),
      unit: json['unit'] ?? '',
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp']) ?? DateTime.now()
          : DateTime.now(),
      // z-score/percentile may be null until the baseline table is seeded —
      // never assume these exist, always null-check before displaying.
      zScore: json['zScore'] != null ? (json['zScore']).toDouble() : null,
      percentile:
          json['percentile'] != null ? (json['percentile']).toDouble() : null,
      syncStatus: json['syncStatus'] ?? 'local',
    );
  }

  String get displayTestType {
    switch (testType) {
      case 'vertical_jump':
        return 'Vertical Jump';
      case 'pushup':
        return 'Push-ups';
      case 'situp':
        return 'Sit-ups';
      default:
        return testType;
    }
  }
}

class RosterStudentModel {
  final String id;
  final String name;
  final int age;
  final String gender;
  final String? village;
  final String? district;
  final DateTime enrolledAt;

  RosterStudentModel({
    required this.id,
    required this.name,
    required this.age,
    required this.gender,
    this.village,
    this.district,
    required this.enrolledAt,
  });

  factory RosterStudentModel.fromJson(Map<String, dynamic> json) {
    return RosterStudentModel(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? 'Unnamed',
      age: json['age'] ?? 0,
      gender: json['gender'] ?? '',
      village: json['village'],
      district: json['district'],
      enrolledAt: json['enrolledAt'] != null
          ? DateTime.tryParse(json['enrolledAt']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
