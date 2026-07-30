import { ParsedVulnerability, ScanGrade } from '../../types';

export function calculateSecurityScore(vulnerabilities: ParsedVulnerability[]): { score: number, grade: ScanGrade } {
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let infoCount = 0;

  for (const vuln of vulnerabilities) {
    if (vuln.severity === 'CRITICAL') criticalCount++;
    else if (vuln.severity === 'HIGH') highCount++;
    else if (vuln.severity === 'MEDIUM') mediumCount++;
    else if (vuln.severity === 'LOW') lowCount++;
    else if (vuln.severity === 'INFO') infoCount++;
  }

  const deductions = {
    CRITICAL: Math.min(criticalCount * 25, 60),  // Cap at -60
    HIGH: Math.min(highCount * 15, 40),          // Cap at -40
    MEDIUM: Math.min(mediumCount * 8, 25),       // Cap at -25
    LOW: Math.min(lowCount * 3, 15),             // Cap at -15
    INFO: Math.min(infoCount * 1, 5)             // Cap at -5
  };

  const totalDeduction = Math.min(
    deductions.CRITICAL + deductions.HIGH + deductions.MEDIUM + deductions.LOW + deductions.INFO,
    100
  );
  
  const score = Math.max(0, 100 - totalDeduction);
  
  let grade: ScanGrade = 'F';
  if (score >= 90) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 50) grade = 'D';

  return { score, grade };
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Fair";
  if (score >= 60) return "Poor";
  if (score >= 50) return "Critical Risk";
  return "Dangerous";
}

export function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-500";
  if (score >= 80) return "text-green-400";
  if (score >= 70) return "text-yellow-500";
  if (score >= 60) return "text-orange-500";
  if (score >= 50) return "text-red-500";
  return "text-red-700";
}

export function getScoreMessage(score: number): string {
  if (score >= 90) return "Excellent security posture! Keep it up.";
  if (score >= 80) return "Good security. Minor improvements needed.";
  if (score >= 70) return "Fair security. Several issues to address.";
  if (score >= 60) return "Poor security. Attention required.";
  if (score >= 50) return "Critical vulnerabilities detected. Fix immediately.";
  return "Dangerous security state. Do not deploy.";
}
