program LegacyCSV;

{$mode objfpc}{$H+}

uses
  SysUtils, DateUtils, Process, Crt, Classes;

const
  ENV_CSV_OUT_DIR = 'CSV_OUT_DIR';
  ENV_PGHOST = 'PGHOST';
  ENV_PGPORT = 'PGPORT';
  ENV_PGUSER = 'PGUSER';
  ENV_PGPASSWORD = 'PGPASSWORD';
  ENV_PGDATABASE = 'PGDATABASE';
  ENV_GEN_PERIOD_SEC = 'GEN_PERIOD_SEC';

  DEFAULT_CSV_OUT_DIR = '/data/csv';
  DEFAULT_PGHOST = 'db';
  DEFAULT_PGPORT = '5432';
  DEFAULT_PGUSER = 'monouser';
  DEFAULT_PGPASSWORD = 'monopass';
  DEFAULT_PGDATABASE = 'monolith';
  DEFAULT_GEN_PERIOD_SEC = 300;

function GetEnvironmentVariableOrDefault(const VarName, DefaultValue: string): string;
var
  Value: string;
begin
  Value := GetEnvironmentVariable(VarName);
  if Value = '' then
    Result := DefaultValue
  else
    Result := Value;
end;

function GenerateRandomFloat(MinValue, MaxValue: Double): Double;
begin
  Result := MinValue + Random * (MaxValue - MinValue);
end;

function FormatFloatValue(Value: Double): string;
begin
  Result := FormatFloat('0.00', Value);
end;

procedure CreateCSVFile(const FilePath: string; const FileName: string);
var
  CSVFile: TextFile;
  CurrentTime: TDateTime;
  Voltage, Temperature: Double;
begin
  AssignFile(CSVFile, FilePath);
  try
    Rewrite(CSVFile);

    WriteLn(CSVFile, 'recorded_at,voltage,temp,source_file');

    CurrentTime := Now;
    Voltage := GenerateRandomFloat(3.2, 12.6);
    Temperature := GenerateRandomFloat(-50.0, 80.0);

    WriteLn(CSVFile,
      FormatDateTime('yyyy-mm-dd hh:nn:ss', CurrentTime) + ',' +
      FormatFloatValue(Voltage) + ',' +
      FormatFloatValue(Temperature) + ',' +
      FileName
    );

    WriteLn('Created CSV file: ', FilePath);
  finally
    CloseFile(CSVFile);
  end;
end;

procedure ImportToPostgreSQL(const CSVFilePath: string);
var
  PGHost, PGPort, PGUser, PGPassword, PGDatabase, CopyCommand: string;
  ProcessOutput: TProcess;
begin
  PGHost := GetEnvironmentVariableOrDefault(ENV_PGHOST, DEFAULT_PGHOST);
  PGPort := GetEnvironmentVariableOrDefault(ENV_PGPORT, DEFAULT_PGPORT);
  PGUser := GetEnvironmentVariableOrDefault(ENV_PGUSER, DEFAULT_PGUSER);
  PGPassword := GetEnvironmentVariableOrDefault(ENV_PGPASSWORD, DEFAULT_PGPASSWORD);
  PGDatabase := GetEnvironmentVariableOrDefault(ENV_PGDATABASE, DEFAULT_PGDATABASE);

  CopyCommand := 'PGPASSWORD=' + PGPassword + ' psql "host=' + PGHost +
                 ' port=' + PGPort +
                 ' user=' + PGUser +
                 ' dbname=' + PGDatabase + '" ' +
                 '-c "\copy telemetry_legacy(recorded_at, voltage, temp, source_file) ' +
                 'FROM ''' + CSVFilePath + ''' WITH (FORMAT csv, HEADER true)"';

  WriteLn('Importing to PostgreSQL...');

  ProcessOutput := TProcess.Create(nil);
  try
    ProcessOutput.Executable := 'bash';
    ProcessOutput.Parameters.Add('-c');
    ProcessOutput.Parameters.Add(CopyCommand);
    ProcessOutput.Options := ProcessOutput.Options + [poWaitOnExit];
    ProcessOutput.Execute;

    if ProcessOutput.ExitCode = 0 then
      WriteLn('Successfully imported data to PostgreSQL')
    else
      WriteLn('Warning: PostgreSQL import returned exit code: ', ProcessOutput.ExitCode);
  finally
    ProcessOutput.Free;
  end;
end;

procedure GenerateAndImportData();
var
  OutputDirectory, FileName, FilePath, TimeStamp: string;
begin
  OutputDirectory := GetEnvironmentVariableOrDefault(ENV_CSV_OUT_DIR, DEFAULT_CSV_OUT_DIR);

  if not DirectoryExists(OutputDirectory) then
    CreateDir(OutputDirectory);

  TimeStamp := FormatDateTime('yyyymmdd_hhnnss', Now);
  FileName := 'telemetry_' + TimeStamp + '.csv';
  FilePath := IncludeTrailingPathDelimiter(OutputDirectory) + FileName;

  CreateCSVFile(FilePath, FileName);
  ImportToPostgreSQL(FilePath);
end;

procedure RunMainLoop;
var
  GenerationPeriod: Integer;
  ErrorCount: Integer;
  MaxErrorCount: Integer;
begin
  Randomize;
  ErrorCount := 0;
  MaxErrorCount := 10;

  GenerationPeriod := StrToIntDef(
    GetEnvironmentVariableOrDefault(ENV_GEN_PERIOD_SEC, IntToStr(DEFAULT_GEN_PERIOD_SEC)),
    DEFAULT_GEN_PERIOD_SEC
  );

  WriteLn('Starting Legacy CSV Generator');
  WriteLn('Generation period: ', GenerationPeriod, ' seconds');
  WriteLn('Press Ctrl+C to stop');
  WriteLn('');

  while True do
  begin
    try
      GenerateAndImportData();
      ErrorCount := 0;
      WriteLn('Waiting ', GenerationPeriod, ' seconds until next generation...');
      WriteLn('');
    except
      on E: Exception do
      begin
        Inc(ErrorCount);
        WriteLn(FormatDateTime('yyyy-mm-dd hh:nn:ss', Now),
                ' - Error #', ErrorCount, ': ', E.Message);

        if ErrorCount >= MaxErrorCount then
        begin
          WriteLn('Too many consecutive errors. Sleeping for 60 seconds...');
          Sleep(60000);
          ErrorCount := 0;
        end;
      end;
    end;

    Sleep(GenerationPeriod * 1000);
  end;
end;

begin
  try
    RunMainLoop;
  except
    on E: Exception do
    begin
      WriteLn('Fatal error in main program: ', E.Message);
      WriteLn('Program terminated');
    end;
  end;
end.