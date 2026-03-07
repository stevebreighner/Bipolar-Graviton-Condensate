<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$dataDir = realpath(__DIR__ . '/../data');
if ($dataDir === false) {
    $dataDir = __DIR__ . '/../data';
    if (!is_dir($dataDir) && !mkdir($dataDir, 0775, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not prepare data directory.']);
        exit;
    }
}

$treeFile = $dataDir . '/tree-data.json';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (!is_file($treeFile)) {
        http_response_code(404);
        echo json_encode(['error' => 'No saved tree file yet.']);
        exit;
    }

    $content = file_get_contents($treeFile);
    if ($content === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not read saved tree file.']);
        exit;
    }

    echo $content;
    exit;
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        $raw = '{}';
    }

    $decoded = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON body.']);
        exit;
    }

    $pretty = json_encode($decoded, JSON_PRETTY_PRINT);
    if ($pretty === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not encode JSON body.']);
        exit;
    }

    $written = file_put_contents($treeFile, $pretty . "\n", LOCK_EX);
    if ($written === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not save tree file.']);
        exit;
    }

    echo json_encode([
        'ok' => true,
        'path' => $treeFile,
        'overwritten' => true,
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed.']);
